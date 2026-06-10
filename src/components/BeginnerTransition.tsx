import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, CheckCircle2, Sparkles, Award
} from 'lucide-react';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { audioFeedback } from '../utils/audio';

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
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [testScore, setTestScore] = useState<number | null>(null);

  // Real calibration states
  const [prompts, setPrompts] = useState<{ action: string; button: ButtonKey }[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [promptStartTime, setPromptStartTime] = useState(0);

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

  const generatePrompts = (day: CurriculumDay): { action: string; button: ButtonKey }[] => {
    let pool: ButtonKey[] = ['A', 'B', 'X', 'Y'];
    const dNum = day.dayNum;
    if (dNum === 1) pool = ['A', 'B', 'X', 'Y'];
    else if (dNum === 2) pool = ['A', 'B', 'X', 'Y', 'LB', 'RB'];
    else if (dNum === 3) pool = ['LT', 'RT'];
    else if (dNum === 4) pool = ['DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];
    else if (dNum === 5) pool = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT'];
    else if (dNum === 6 || dNum === 7) pool = ['LeftStick', 'RightStick'];
    else if (dNum === 8) pool = ['L3', 'R3'];
    else if (dNum === 9) pool = ['L3', 'R3', 'LB', 'RB'];
    else if (dNum === 10) pool = ['A', 'B', 'L3', 'R3', 'LT', 'RT'];
    else if (dNum === 11) pool = ['B', 'A', 'X', 'Y'];
    else if (dNum === 12) pool = ['RT', 'LB', 'LT', 'A'];
    else if (dNum === 13) pool = ['B', 'RB', 'LB', 'R3'];
    else pool = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'L3', 'R3'];

    const count = 10;
    const generated: { action: string; button: ButtonKey }[] = [];
    for (let i = 0; i < count; i++) {
      const btn = pool[Math.floor(Math.random() * pool.length)];
      let actName = `PRESS ${btn}`;
      if (btn === 'LeftStick' || btn === 'RightStick') actName = `DEFLECT ${btn === 'LeftStick' ? 'LEFT' : 'RIGHT'} STICK`;
      else if (btn === 'L3' || btn === 'R3') actName = `CLICK ${btn === 'L3' ? 'LEFT' : 'RIGHT'} STICK (L3/R3)`;
      else if (btn === 'LT' || btn === 'RT') actName = `PULL ${btn === 'LT' ? 'LEFT' : 'RIGHT'} TRIGGER`;
      else if (btn.startsWith('Dpad')) actName = `TAP DPAD ${btn.replace('Dpad', '')}`;
      generated.push({ action: actName, button: btn });
    }
    return generated;
  };

  const handleLaunch = (day: CurriculumDay) => {
    setActiveDayTest(day);
    setGameState('idle');
    setTestScore(null);
    setPrompts(generatePrompts(day));
    triggerHaptic('correct');
  };

  const startTrial = () => {
    setGameState('countdown');
    setCountdown(3);
    triggerHaptic('correct');
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        t = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        setPromptIndex(0);
        setCorrectHits(0);
        setReactionTimes([]);
        setPromptStartTime(performance.now());
      }
    }
    return () => clearTimeout(t);
  }, [gameState, countdown]);

  const handleGamepadPress = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing' || !activeDayTest) return;

    const currentPrompt = prompts[promptIndex];
    const timeSpent = performance.now() - promptStartTime;

    const isCorrect = clickedButton === currentPrompt.button;

    if (isCorrect) {
      triggerHaptic('correct');
      audioFeedback.play('correct');
      setCorrectHits(prev => prev + 1);
      setReactionTimes(prev => [...prev, timeSpent]);
    } else {
      triggerHaptic('incorrect');
      audioFeedback.play('incorrect');
    }

    const nextIdx = promptIndex + 1;
    if (nextIdx >= prompts.length) {
      const finalCorrect = isCorrect ? correctHits + 1 : correctHits;
      const finalAccuracy = Math.round((finalCorrect / prompts.length) * 100);
      setTestScore(finalAccuracy);
      setGameState('completed');
    } else {
      setPromptIndex(nextIdx);
      setPromptStartTime(performance.now());
    }
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
  const currentPrompt = prompts[promptIndex];
  const avgSpeed = reactionTimes.length > 0 
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
    : 0;

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
            <div className="py-6 bg-zinc-900/10 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center w-full min-h-[140px]">
              {gameState === 'idle' && (
                <div className="space-y-1 py-2 text-xs text-zinc-500">
                  Ready to calibrate day trial.
                </div>
              )}

              {gameState === 'countdown' && (
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin mx-auto" />
                  <span className="text-[12px] font-black text-brand-cyan uppercase font-display animate-pulse">{countdown}...</span>
                </div>
              )}

              {gameState === 'playing' && currentPrompt && (
                <div className="space-y-4 w-full px-4">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase font-display">
                    <span>Target Calibration</span>
                    <span>Prompt {promptIndex + 1} / {prompts.length}</span>
                  </div>
                  <h3 className="text-2xl font-black text-brand-purple font-display uppercase tracking-wider animate-pulse text-center">
                    {currentPrompt.action}
                  </h3>
                  <div className="py-1">
                    <ControllerView
                      hidePanel={true}
                      highlightedButton={currentPrompt.button}
                      onButtonClick={handleGamepadPress}
                      className="max-w-[280px] mx-auto"
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-900 text-left space-y-1 font-mono max-w-xs mx-auto">
                    <span className="block text-[8px] uppercase font-bold text-zinc-400 font-sans mb-1 text-center">Keyboard Helper Keys</span>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <span>Face Cluster: A/B/X/Y</span>
                      <span>Bumpers: Q/L (LB) / E/R (RB)</span>
                      <span>Triggers: 1 (LT) / 2 (RT)</span>
                      <span>D-Pad: Arrow keys</span>
                      <span>Clicks: 3 (L3) / 4 (R3)</span>
                      <span>Sticks: 5 (LS) / 6 (RS)</span>
                    </div>
                  </div>
                </div>
              )}

              {gameState === 'completed' && testScore !== null && (
                <div className="space-y-4 w-full px-6">
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 bg-brand-purple/10 border border-brand-purple/20 rounded-full flex items-center justify-center text-brand-purple">
                      <Award className="h-6 w-6 animate-bounce" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 border border-zinc-900 p-3 rounded-2xl text-left">
                    <div>
                      <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Accuracy</span>
                      <span className="text-lg font-black text-white font-mono">{testScore}%</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Avg Speed</span>
                      <span className="text-lg font-black text-brand-cyan font-mono">{avgSpeed}ms</span>
                    </div>
                  </div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Day Status: {testScore >= 80 ? 'PASSED' : 'RETRY REQUIRED'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
              <button
                onClick={() => setActiveDayTest(null)}
                className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-300"
                disabled={gameState === 'countdown' || gameState === 'playing'}
              >
                Exit
              </button>
              {gameState === 'idle' && (
                <button
                  onClick={startTrial}
                  className="px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/10"
                >
                  Start Day Calibration
                </button>
              )}
              {gameState === 'completed' && testScore !== null && (
                <>
                  {testScore < 80 ? (
                    <button
                      onClick={startTrial}
                      className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-500/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider"
                    >
                      Retry calibration
                    </button>
                  ) : (
                    <button
                      onClick={completeDay}
                      className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/95 text-white text-xs font-black font-display uppercase tracking-wider"
                    >
                      Submit Calibration Log
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
