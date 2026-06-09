import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatsCard } from '../components/StatsCard';
import { Chart } from '../components/Chart';
import { ControllerSvg } from '../components/ControllerSvg';
import { ControllerView } from '../components/ControllerView';
import { 
  Play, Sparkles, Flame, BarChart2, ShieldAlert, 
  Clock, Zap, TrendingUp, Gauge, AlertCircle, CheckCircle2
} from 'lucide-react';

interface DashboardPageProps {
  setActivePage: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActivePage }) => {
  const { 
    profile, 
    stats, 
    simulateStreak, 
    achievements, 
    readinessScore,
    readinessRank,
    weaknessRecommendations,
    selectSkin
  } = useApp();
  const [activePart, setActivePart] = useState<'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progression' | 'diagnostics'>('overview');
  const [heatmapOverlayMode, setHeatmapOverlayMode] = useState<'none' | 'mistakes' | 'speed' | 'practice'>('none');

  // Filter unlocked achievements for dashboard highlight
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const recentAchievements = achievements
    .filter(a => a.isUnlocked)
    .slice(-2);

  // Calculate XP percentage
  const xpPercentage = Math.min(100, (profile.xp / profile.xpNeeded) * 100);

  // Calculate accuracy trend
  const calculateAccuracyTrend = () => {
    if (!stats.history || stats.history.length < 2) {
      return { status: 'STABLE', text: 'Telemetry calibrating...', color: 'text-zinc-400' };
    }
    const midpoint = Math.floor(stats.history.length / 2);
    const firstHalf = stats.history.slice(0, midpoint);
    const secondHalf = stats.history.slice(midpoint);
    const avgFirst = firstHalf.reduce((sum, h) => sum + h.accuracy, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, h) => sum + h.accuracy, 0) / secondHalf.length;
    const difference = avgSecond - avgFirst;

    if (difference > 1.0) {
      return { status: 'IMPROVING', text: `Upward curve (+${difference.toFixed(1)}% accuracy shift)`, color: 'text-brand-green' };
    } else if (difference < -1.0) {
      return { status: 'DRIFTING', text: `Downward drift (${difference.toFixed(1)}% accuracy shift)`, color: 'text-red-400' };
    } else {
      return { status: 'STABLE', text: 'Consistent telemetry calibration (minimal variance)', color: 'text-brand-cyan' };
    }
  };

  const trend = calculateAccuracyTrend();

  // Button mastery ratings
  const buttonMastery = stats.buttonMastery || {};
  const buttonMistakes = stats.buttonMistakes || {};
  const BUTTON_POOL = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'LeftStick', 'RightStick', 'Start', 'Back'];

  BUTTON_POOL.forEach((btn) => {
    if (buttonMastery[btn] === undefined) buttonMastery[btn] = 85;
    if (buttonMistakes[btn] === undefined) buttonMistakes[btn] = 0;
  });

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

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-900 pb-2 gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-zinc-900/60 text-brand-cyan border-b-2 border-brand-cyan'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          Hub Overview
        </button>
        <button
          onClick={() => setActiveTab('progression')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'progression'
              ? 'bg-zinc-900/60 text-brand-purple border-b-2 border-brand-purple'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Mastery & Progression
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'diagnostics'
              ? 'bg-zinc-900/60 text-brand-magenta border-b-2 border-brand-magenta'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Gauge className="h-4 w-4" />
          Diagnostics Lab
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Grid: Telemetry Stats Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Readiness Score"
              value={readinessScore}
              suffix="/100"
              iconName="Award"
              colorClass="cyan"
              description={`Rank calls: ${readinessRank}`}
            />
            <StatsCard
              title="Average Accuracy"
              value={stats.accuracy}
              suffix="%"
              iconName="Target"
              colorClass="purple"
              description="Mechanics friction aim precision"
            />
            <StatsCard
              title="Reflex Response"
              value={stats.reactionTime}
              suffix="ms"
              iconName="Zap"
              colorClass="magenta"
              description="Average popup speed latency"
            />
            <StatsCard
              title="Streak Calibration"
              value={stats.streak}
              suffix=" Days"
              iconName="Flame"
              colorClass="green"
              description={`${stats.drillsCompleted} drills logged successfully`}
            />
          </section>

          {/* Weaknesses Panel */}
          <section className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase font-display border-b border-zinc-900 pb-2">
              <AlertCircle className="h-4.5 w-4.5 animate-pulse" />
              Weakness Detection Recommendations
            </div>
            <div className="space-y-2">
              {weaknessRecommendations.map((rec, idx) => (
                <div key={idx} className="text-xs text-zinc-400 flex items-start gap-2 bg-zinc-900/10 p-2.5 rounded-xl border border-zinc-900">
                  <span className="text-red-400 font-bold font-mono">[{idx + 1}]</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Analytics Chart & Interactive Controller Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* SVG Historical Chart (Left/7 Columns) */}
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
              <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                    Heatmap & Layout
                  </h2>
                  <p className="text-[10px] text-zinc-500">
                    Calibration overlay: {heatmapOverlayMode.toUpperCase()}
                  </p>
                </div>
                
                {/* Heatmap Mode togglers */}
                <select
                  value={heatmapOverlayMode}
                  onChange={(e) => setHeatmapOverlayMode(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-[10px] font-black font-display uppercase text-zinc-300 rounded-lg p-1.5 focus:outline-none"
                >
                  <option value="none">Standard Layout</option>
                  <option value="mistakes">Heatmap: Mistakes</option>
                  <option value="speed">Heatmap: Latency</option>
                  <option value="practice">Heatmap: Practice Count</option>
                </select>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[220px]">
                <ControllerSvg 
                  type={profile.controllerType} 
                  activePart={activePart} 
                  heatmapMode={heatmapOverlayMode} 
                  className="max-w-[280px]" 
                />
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
      )}

      {activeTab === 'progression' && (
        <div className="space-y-6">
          
          {/* Level Progress details & Daily streak & Time stats */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Level card */}
            <div className="md:col-span-4 glass-panel p-5 rounded-2xl border border-white/5 space-y-4 text-left flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-brand-purple font-display tracking-wider">Mechanics Rank</span>
                  <span className="text-xs font-semibold text-zinc-400">LVL {profile.level}</span>
                </div>
                <h3 className="text-lg font-black text-white font-display uppercase tracking-tight truncate">
                  {profile.title}
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <span>Progress to Next Rank</span>
                  <span>{profile.xp} / {profile.xpNeeded} XP</span>
                </div>
                <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
                <p className="text-[9px] text-zinc-500">
                  Log calibration drills and unlock achievements to earn XP and level up your rating callsign.
                </p>
              </div>
            </div>

            {/* Stats Telemetry cards */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Daily Streak Card */}
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                  <Flame className="h-20 w-20 text-red-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">Daily Streak</span>
                  <Flame className={`h-4 w-4 ${stats.streak > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`} />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-white font-display">{stats.streak}</span>
                  <span className="text-xs font-bold text-zinc-500 ml-1">Days</span>
                  <p className="text-[8px] text-zinc-500 mt-1 leading-normal">
                    {stats.streak >= 3 ? 'Max streak bonus active!' : 'Practice daily to stack streak multipliers.'}
                  </p>
                </div>
              </div>

              {/* Total Playtime Card */}
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">Duty Time</span>
                  <Clock className="h-4 w-4 text-brand-cyan" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-white font-display">
                    {stats.totalPlaytime}
                  </span>
                  <span className="text-xs font-bold text-zinc-500 ml-1">Mins</span>
                  <p className="text-[8px] text-zinc-500 mt-1 leading-normal">
                    Accumulated active calibration exercise duration.
                  </p>
                </div>
              </div>

              {/* Fastest Reaction Card */}
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">Peak Reflex</span>
                  <Zap className="h-4 w-4 text-brand-purple" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-brand-purple font-display">
                    {stats.fastestReactionTime ?? 210}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 ml-1">ms</span>
                  <p className="text-[8px] text-zinc-500 mt-1 leading-normal">
                    Fastest target click reaction speed ever registered.
                  </p>
                </div>
              </div>

              {/* Trend Vector Card */}
              <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">Acc. Vector</span>
                  <TrendingUp className={`h-4 w-4 ${trend.status === 'IMPROVING' ? 'text-brand-green' : 'text-brand-cyan'}`} />
                </div>
                <div className="mt-4">
                  <span className={`text-sm font-black font-display uppercase ${trend.color}`}>
                    {trend.status}
                  </span>
                  <p className="text-[8px] text-zinc-500 mt-1 leading-normal">
                    {trend.text}
                  </p>
                </div>
              </div>

            </div>

          </section>

          {/* Spaced Repetition Review Queue & Skins Select Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Spaced Repetition Review queue (Left/7 Columns) */}
            <section className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-white/5 space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                  Spaced Repetition Review Calendar
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Interval review schedule for mastered inputs.
                </p>
              </div>

              {/* Check which buttons are due for review */}
              {(() => {
                const now = new Date();
                const spaced = stats.spacedRepetition || {};
                const reviewQueue = Object.entries(spaced)
                  .filter(([_, item]: any) => new Date(item.nextReviewDate) <= now)
                  .map(([btn]) => btn);

                if (reviewQueue.length === 0) {
                  return (
                    <div className="py-10 text-center text-xs text-zinc-500 bg-zinc-900/10 border border-zinc-900/40 rounded-xl space-y-2">
                      <CheckCircle2 className="h-6 w-6 text-brand-green mx-auto" />
                      <p className="font-semibold text-zinc-400">All input bindings are fully calibrated.</p>
                      <p className="text-[9px] text-zinc-500 max-w-xs mx-auto">Next review trigger alerts will appear here automatically when buttons require testing.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2">
                    <span className="text-[9px] uppercase font-extrabold text-red-400 font-display block">Review Required: {reviewQueue.length} Vectors</span>
                    <div className="grid grid-cols-2 gap-2">
                      {reviewQueue.map((btn) => {
                        const info: any = spaced[btn];
                        const daysAgo = Math.max(0, Math.round((now.getTime() - new Date(info.nextReviewDate).getTime()) / (1000 * 3600 * 24)));
                        
                        return (
                          <div key={btn} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <span className="font-extrabold text-white font-display">{btn}</span>
                              <span className="block text-[8px] text-zinc-500">Stage {info.level} Review</span>
                            </div>
                            <span className="text-[9px] font-bold text-red-400 uppercase">
                              {daysAgo === 0 ? 'Due Today' : `${daysAgo}d Overdue`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Unlockable Skins selector (Right/5 Columns) */}
            <section className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-white/5 space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                  Telemetry Visual Skins
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Unlock premium visual styling schemes via the Guided learning levels.
                </p>
              </div>

              {/* Skins selectors */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-2">
                {[
                  { id: 'standard', name: 'Classic Grey', desc: 'Default gray tactical polymer.', requirement: 'Default Unlock' },
                  { id: 'carbon', name: 'Stealth Carbon', desc: 'Carbon weave shell with red highlights.', requirement: 'Guided Path Level 4' },
                  { id: 'cyberpunk', name: 'Neon Cyber', desc: 'Vibrant neon purple and cyan coding.', requirement: 'Guided Path Level 7' },
                  { id: 'gold', name: 'Operative Gold', desc: 'Metallic gold plating for master aimers.', requirement: 'Guided Path Level 10' }
                ].map((skin) => {
                  const isUnlocked = profile.skinsUnlocked?.includes(skin.id as any) || skin.id === 'standard';
                  const isEquipped = profile.selectedSkin === skin.id;

                  return (
                    <div 
                      key={skin.id}
                      className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                        isEquipped ? 'border-brand-cyan bg-brand-cyan/5 text-brand-cyan' :
                        isUnlocked ? 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700' :
                        'border-zinc-950 bg-zinc-950/20 opacity-45'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold text-zinc-200 font-display">{skin.name}</span>
                        <span className="block text-[8px] text-zinc-500 leading-normal mt-0.5">{skin.desc}</span>
                      </div>
                      
                      {isEquipped ? (
                        <span className="text-[9px] font-black uppercase text-brand-cyan border border-brand-cyan/30 px-2.5 py-1 rounded bg-brand-cyan/5 font-display select-none">
                          Active
                        </span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => selectSkin(skin.id as any)}
                          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider font-display bg-zinc-900 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Equip
                        </button>
                      ) : (
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                          {skin.requirement}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

        </div>
      )}

      {activeTab === 'diagnostics' && (
        <section className="space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-sm font-black font-display uppercase tracking-wider text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
              Xbox 360 Hardware Diagnostics Lab
            </h2>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
              Sub-system: Input Calibration Matrix
            </span>
          </div>
          <ControllerView />
        </section>
      )}

    </div>
  );
};
