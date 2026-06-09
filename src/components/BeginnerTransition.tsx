import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, CheckCircle2, Sparkles 
} from 'lucide-react';

interface CurriculumDay {
  dayNum: number;
  title: string;
  focus: string;
  drillId: string;
  xpReward: number;
}

export const BeginnerTransition: React.FC = () => {
  const { profile, completeCurriculumDay, triggerHaptic } = useApp();
  
  const currentDay = profile.curriculumDay || 1;
  const progress = profile.curriculumProgress || {};

  // Testing states
  const [activeDayTest, setActiveDayTest] = useState<CurriculumDay | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simAccuracy, setSimAccuracy] = useState(90);
  const [testScore, setTestScore] = useState<number | null>(null);

  const DAYS: CurriculumDay[] = [
    { dayNum: 1, title: 'Face Buttons Foundation', focus: 'Visually recall A, B, X, Y cluster placement.', drillId: 'micro_adjustments', xpReward: 100 },
    { dayNum: 2, title: 'Face Buttons + Bumpers', focus: 'Alternate indexing bumpers and thumbs.', drillId: 'target_snap', xpReward: 100 },
    { dayNum: 3, title: 'Analog Triggers Calibration', focus: 'Learn trigger tension depth curves.', drillId: 'reaction_snap', xpReward: 100 },
    { dayNum: 4, title: 'D-Pad Navigational Recall', focus: 'Identify directional arrows under stress.', drillId: 'micro_adjustments', xpReward: 100 },
    { dayNum: 5, title: 'Mixed Action Cluster', focus: 'Quick snaps between bumpers, triggers, and buttons.', drillId: 'reaction_snap', xpReward: 100 },
    { dayNum: 6, title: 'Analog stick tracking', focus: 'Maintain slow joystick aims on moving targets.', drillId: 'slow_tracking', xpReward: 100 },
    { dayNum: 7, title: 'Aim Centering Calibrations', focus: 'Return sticks cleanly back to zero deadzones.', drillId: 'slow_tracking', xpReward: 100 },
    { dayNum: 8, title: 'Stick Clicks (L3/R3)', focus: 'Click joysticks down under static positions.', drillId: 'strafe_aim', xpReward: 100 },
    { dayNum: 9, title: 'Sprint coordination clicks', focus: 'Hold LS UP while clicking L3 coordinates.', drillId: 'strafe_aim', xpReward: 100 },
    { dayNum: 10, title: 'Mixed coordinate controls', focus: 'Navigate aim sticks while tapping jump buttons.', drillId: 'slide_cancel', xpReward: 100 },
    { dayNum: 11, title: 'Action combo sequences', focus: 'Execute slide-crouch-jumps back to back.', drillId: 'slide_cancel', xpReward: 100 },
    { dayNum: 12, title: 'GTA Drive & Shoot controls', focus: 'Practice throttle triggers and bumper zooms.', drillId: 'strafe_aim', xpReward: 100 },
    { dayNum: 13, title: 'Elden Ring boss dodges', focus: 'Alternate roll buttons and lock-on snaps.', drillId: 'slide_cancel', xpReward: 100 },
    { dayNum: 14, title: 'Mixed Combat Protocols', focus: 'Full layout coordination challenge exam.', drillId: 'slide_cancel', xpReward: 100 },
  ];

  const handleLaunch = (day: CurriculumDay) => {
    setActiveDayTest(day);
    setSimRunning(false);
    setTestScore(null);
    triggerHaptic('correct');
  };

  const runSim = () => {
    setSimRunning(true);
    triggerHaptic('correct');
    setTimeout(() => {
      setSimRunning(false);
      setTestScore(simAccuracy);
    }, 2000);
  };

  const completeDay = () => {
    if (!activeDayTest || testScore === null) return;

    if (testScore >= 80) {
      if (activeDayTest.dayNum === currentDay && currentDay <= 14) {
        completeCurriculumDay(activeDayTest.dayNum);
      }
    }
    setActiveDayTest(null);
  };

  const completedCount = Object.keys(progress).length;

  return (
    <div className="space-y-6 text-left">
      
      {/* HUD Header */}
      <section className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-cyan" />
            14-Day KB/M Transition Curriculum
          </h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-lg">
            A scientifically structured 14-day training schedule built specifically to help lifelong PC players transition from keyboard and mouse to instinctual controller muscle memory.
          </p>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-right flex-shrink-0">
          <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Curriculum Progress</span>
          <span className="text-lg font-black text-brand-cyan font-mono">{completedCount} / 14 Days</span>
        </div>
      </section>

      {/* Grid calendar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4">
        {DAYS.map((day) => {
          const isDone = progress[day.dayNum] === true;
          const isActive = day.dayNum === currentDay;
          const isLocked = day.dayNum > currentDay;

          return (
            <button
              key={day.dayNum}
              onClick={() => !isLocked && handleLaunch(day)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all duration-300 relative select-none ${
                isDone ? 'border-brand-green/30 bg-brand-green/2 hover:border-brand-green/50 cursor-pointer' :
                isActive ? 'border-brand-purple bg-brand-purple/5 shadow-md shadow-brand-purple/5 cursor-pointer animate-pulse-glow' :
                'border-white/5 bg-zinc-950/20 opacity-50 grayscale cursor-not-allowed'
              }`}
              disabled={isLocked}
            >
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black font-display text-zinc-500 uppercase">DAY {day.dayNum}</span>
                  {isDone && <CheckCircle2 className="h-4 w-4 text-brand-green" />}
                  {isActive && <Sparkles className="h-4 w-4 text-brand-purple animate-spin" />}
                </div>
                <h4 className="text-xs font-bold text-white uppercase font-display mt-2 line-clamp-1">
                  {day.title}
                </h4>
                <p className="text-[9px] text-zinc-500 mt-1 leading-normal line-clamp-2">
                  {day.focus}
                </p>
              </div>
              <span className="text-[8px] font-black text-brand-cyan uppercase tracking-wider font-display pt-2 block">
                {isDone ? 'Mastered' : isActive ? 'Begin Trial &rarr;' : 'Locked'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Trial simulation dialog */}
      {activeDayTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border border-brand-purple/30 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col p-6 space-y-6 text-center">
            
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-brand-purple font-display tracking-widest">
                Transition Program Day {activeDayTest.dayNum}
              </span>
              <h3 className="text-base font-black text-white font-display uppercase">
                {activeDayTest.title}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Complete the daily practice session. Minimum 80% accuracy required.
              </p>
            </div>

            {/* Sim HUD */}
            <div className="py-6 bg-zinc-900/10 border border-zinc-905 rounded-2xl flex flex-col items-center justify-center">
              {simRunning ? (
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin mx-auto" />
                  <span className="text-[10px] font-bold text-brand-cyan uppercase font-display animate-pulse">Running telemetry calibrations...</span>
                </div>
              ) : testScore !== null ? (
                <div className="space-y-2">
                  <span className="text-3xl font-black text-white font-display">{testScore}%</span>
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Day Status: {testScore >= 80 ? 'PASSED' : 'RETRY REQUIRED'}
                  </span>
                </div>
              ) : (
                <div className="space-y-1 py-2 text-xs text-zinc-500">
                  Ready to calibrate day trial.
                </div>
              )}
            </div>

            {testScore === null && !simRunning && (
              <div className="space-y-2 text-left w-full max-w-xs mx-auto">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase font-display">
                  <span>Accuracy preset</span>
                  <span className="text-brand-purple">{simAccuracy}%</span>
                </div>
                <input 
                  type="range" min="60" max="100" value={simAccuracy}
                  onChange={(e) => setSimAccuracy(Number(e.target.value))}
                  className="w-full accent-brand-purple bg-zinc-950 rounded-lg appearance-none h-1.5"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
              <button
                onClick={() => setActiveDayTest(null)}
                className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-300"
                disabled={simRunning}
              >
                Exit
              </button>
              {testScore === null ? (
                <button
                  onClick={runSim}
                  className="px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/10"
                  disabled={simRunning}
                >
                  Start Day Calibration
                </button>
              ) : (
                <button
                  onClick={completeDay}
                  className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/95 text-white text-xs font-black font-display uppercase tracking-wider"
                >
                  {testScore >= 80 ? 'Complete Day' : 'Retry'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
