import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { Zap, Flame, ShieldAlert, CheckCircle2, RotateCcw, Clock, Award, Activity } from 'lucide-react';

type ComboDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
type ComboGameMode = 'timetrial' | 'endless';

interface ComboSessionResult {
  date: string;
  gameMode: ComboGameMode;
  difficulty: ComboDifficulty;
  accuracy: number;
  maxStreak: number;
  avgComboTime: number; // in ms
  score: number;
}

const BUTTON_POOL: ButtonKey[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];

const PRESETS: Record<ComboDifficulty, ButtonKey[][]> = {
  easy: [
    ['A', 'X'],
    ['Y', 'B'],
    ['LT', 'RT'],
    ['LB', 'RB'],
    ['DpadUp', 'DpadDown'],
    ['DpadLeft', 'DpadRight'],
    ['A', 'X', 'A'],
    ['B', 'Y', 'B'],
    ['LT', 'A', 'RT'],
    ['LB', 'X', 'RB']
  ],
  medium: [
    ['LT', 'RT', 'A'],
    ['LB', 'RB', 'X'],
    ['DpadDown', 'DpadUp', 'A'],
    ['B', 'B', 'A'], // Slide cancel style
    ['X', 'Y', 'Y'], // Reload cancel style
    ['LT', 'X', 'RT'],
    ['A', 'X', 'Y', 'B'],
    ['LB', 'A', 'RB', 'B'],
    ['DpadLeft', 'A', 'DpadRight', 'X']
  ],
  hard: [
    ['LB', 'X', 'RB', 'Y'],
    ['LT', 'RT', 'LB', 'RB', 'A'],
    ['B', 'B', 'A', 'LT'], // Slide cancel slide aim
    ['DpadLeft', 'DpadRight', 'X', 'Y', 'B'],
    ['LB', 'LT', 'RB', 'RT', 'A'],
    ['X', 'Y', 'LB', 'RB', 'A', 'B'],
    ['LT', 'A', 'X', 'RT', 'B', 'Y']
  ],
  expert: [
    ['LB', 'X', 'RB', 'Y', 'LT', 'RT'],
    ['DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'A', 'B'],
    ['LT', 'A', 'RT', 'B', 'LB', 'X', 'RB', 'Y'],
    ['B', 'B', 'A', 'LT', 'RT', 'X', 'Y'],
    ['LB', 'LT', 'DpadUp', 'RB', 'RT', 'DpadDown', 'A'],
    ['Y', 'X', 'B', 'A', 'LB', 'RB', 'LT', 'RT']
  ]
};

export const ComboTraining: React.FC = () => {
  const { logDrillSession, triggerHaptic } = useApp();

  // Settings
  const [activeGameMode, setActiveGameMode] = useState<ComboGameMode | null>(null);
  const [difficulty, setDifficulty] = useState<ComboDifficulty>('medium');
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  
  // Game metrics
  const [activeCombo, setActiveCombo] = useState<ButtonKey[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const maxRounds = 10; // For Time Trial mode

  // Telemetry trackers
  const [successfulCombos, setSuccessfulCombos] = useState(0);
  const [totalCombosAttempted, setTotalCombosAttempted] = useState(0);
  const [totalInputs, setTotalInputs] = useState(0);
  const [correctInputs, setCorrectInputs] = useState(0);
  const [comboTimes, setComboTimes] = useState<number[]>([]); // duration of each successful combo in ms
  const [mistakeLogs, setMistakeLogs] = useState<string[]>([]);
  
  // Timers
  const [speedLimit, setSpeedLimit] = useState(3500); // ms allowed for the combo
  const [timeLeft, setTimeLeft] = useState(3500);
  
  // Visual indicators
  const [comboCompletedFeedback, setComboCompletedFeedback] = useState<'perfect' | 'good' | null>(null);
  const [inputFeedback, setInputFeedback] = useState<{ index: number; status: 'correct' | 'incorrect' } | null>(null);

  // History logs
  const [historyLogs, setHistoryLogs] = useState<ComboSessionResult[]>([]);
  
  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboStartTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_combo_history');
    if (saved) {
      try {
        setHistoryLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse combo history logs', e);
      }
    }
  }, []);

  const saveResult = (result: ComboSessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_combo_history', JSON.stringify(nextLogs));
  };

  const getModeLabel = (mode: ComboGameMode) => {
    return mode === 'timetrial' ? 'Time Trial' : 'Survival Combos';
  };

  const getDifficultyTimeLimit = (diff: ComboDifficulty, comboLen: number): number => {
    // base limit per button: easy: 1.2s, medium: 0.9s, hard: 0.7s, expert: 0.5s
    const perButtonLimit = diff === 'easy' ? 1300 : diff === 'medium' ? 1000 : diff === 'hard' ? 800 : 600;
    return perButtonLimit * comboLen;
  };

  // Generate a random or preset combo
  const generateNextCombo = (diff: ComboDifficulty): ButtonKey[] => {
    const usePreset = Math.random() < 0.6; // 60% chance to use preset
    if (usePreset && PRESETS[diff] && PRESETS[diff].length > 0) {
      const list = PRESETS[diff];
      return list[Math.floor(Math.random() * list.length)];
    }

    // Generate random combo
    const length = diff === 'easy' ? 3 : diff === 'medium' ? 4 : diff === 'hard' ? 5 : 6;
    const combo: ButtonKey[] = [];
    for (let i = 0; i < length; i++) {
      const lastBtn = combo[combo.length - 1];
      const available = BUTTON_POOL.filter(b => b !== lastBtn);
      combo.push(available[Math.floor(Math.random() * available.length)]);
    }
    return combo;
  };

  // Start countdown
  const startGame = (mode: ComboGameMode) => {
    setActiveGameMode(mode);
    setGameState('countdown');
    setCountdown(3);
    setScore(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setRound(1);
    setSuccessfulCombos(0);
    setTotalCombosAttempted(0);
    setTotalInputs(0);
    setCorrectInputs(0);
    setComboTimes([]);
    setMistakeLogs([]);
    setLives(mode === 'endless' ? 3 : 0);
  };

  // Countdown clock effect
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        setupNextComboRound(1);
      }
    }
    return () => clearTimeout(timerId);
  }, [gameState, countdown]);

  const setupNextComboRound = (roundNum: number) => {
    if (gameState === 'completed') return;

    if (activeGameMode === 'timetrial' && roundNum > maxRounds) {
      handleGameOver();
      return;
    }

    setRound(roundNum);
    const nextCombo = generateNextCombo(difficulty);
    setActiveCombo(nextCombo);
    setCurrentStep(0);
    setInputFeedback(null);
    setComboCompletedFeedback(null);

    const limit = getDifficultyTimeLimit(difficulty, nextCombo.length);
    setSpeedLimit(limit);
    setTimeLeft(limit);

    comboStartTimeRef.current = performance.now();
    stepStartTimeRef.current = performance.now();

    if (timerRef.current) clearInterval(timerRef.current);
    const tickRate = 20;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - tickRate;
        if (nextTime <= 0) {
          handleComboTimeout(nextCombo);
          return 0;
        }
        return nextTime;
      });
    }, tickRate);
  };

  const handleComboTimeout = (timedOutCombo: ButtonKey[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    triggerHaptic('incorrect');

    setTotalCombosAttempted(prev => prev + 1);
    setCurrentStreak(0);
    setMistakeLogs(prev => [`Timed out on combo: [${timedOutCombo.join('➔')}]`, ...prev.slice(0, 5)]);

    if (activeGameMode === 'endless') {
      setLives((prev) => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          handleGameOver();
          return 0;
        }
        setupNextComboRound(round + 1);
        return nextLives;
      });
    } else {
      setupNextComboRound(round + 1);
    }
  };

  const handleInput = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing') return;

    const targetButton = activeCombo[currentStep];
    setTotalInputs(prev => prev + 1);

    if (clickedButton === targetButton) {
      // Correct button press!
      setCorrectInputs(prev => prev + 1);
      setInputFeedback({ index: currentStep, status: 'correct' });
      triggerHaptic('correct');

      const nextStep = currentStep + 1;
      if (nextStep === activeCombo.length) {
        // Combo completely finished!
        if (timerRef.current) clearInterval(timerRef.current);

        const duration = Math.round(performance.now() - comboStartTimeRef.current);
        setComboTimes(prev => [...prev, duration]);
        setSuccessfulCombos(prev => prev + 1);
        setTotalCombosAttempted(prev => prev + 1);

        const nextStreak = currentStreak + 1;
        setCurrentStreak(nextStreak);
        if (nextStreak > maxStreak) setMaxStreak(nextStreak);

        // Determine if it was "perfect" timing (under 40% of allowed time)
        const isPerfect = duration < speedLimit * 0.4;
        setComboCompletedFeedback(isPerfect ? 'perfect' : 'good');

        // Score calculations
        const basePoints = activeCombo.length * 100;
        const speedMultiplier = Math.max(1, Math.round((speedLimit / duration) * 1.5));
        const comboMultiplier = Math.floor(nextStreak / 3) + 1; // Increase multiplier every 3 streaks
        const earnedPoints = basePoints * speedMultiplier * comboMultiplier;
        setScore(prev => prev + earnedPoints);

        triggerHaptic('combo');

        // Shave visual feedback and delay next round
        setTimeout(() => {
          setupNextComboRound(round + 1);
        }, 650);
      } else {
        // Advance to next button in the combo
        setCurrentStep(nextStep);
        stepStartTimeRef.current = performance.now();
      }
    } else {
      // Incorrect button press!
      setInputFeedback({ index: currentStep, status: 'incorrect' });
      triggerHaptic('incorrect');
      setCurrentStreak(0);
      
      setMistakeLogs(prev => [
        `Pressed ${clickedButton} instead of ${targetButton} in [${activeCombo.join('➔')}]`,
        ...prev.slice(0, 5)
      ]);

      // Reset to beginning of this combo to make them practice!
      setCurrentStep(0);
      stepStartTimeRef.current = performance.now();
      
      if (activeGameMode === 'endless') {
        // In endless mode, a mistake directly docks a life
        if (timerRef.current) clearInterval(timerRef.current);
        setTotalCombosAttempted(prev => prev + 1);
        setLives((prev) => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            handleGameOver();
            return 0;
          }
          setTimeout(() => {
            setupNextComboRound(round + 1);
          }, 650);
          return nextLives;
        });
      }
    }
  };

  const handleGameOver = () => {
    setGameState('completed');
    if (timerRef.current) clearInterval(timerRef.current);

    const accuracy = totalInputs > 0 ? Math.round((correctInputs / totalInputs) * 100) : 0;
    const avgComboTime = comboTimes.length > 0 ? Math.round(comboTimes.reduce((a, b) => a + b, 0) / comboTimes.length) : 0;

    const result: ComboSessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      gameMode: activeGameMode!,
      difficulty,
      accuracy,
      maxStreak,
      avgComboTime,
      score
    };

    saveResult(result);

    // Sync XP rewards
    // Base 50 XP + Bonus XP based on score and streak
    logDrillSession(activeGameMode === 'timetrial' ? 'slow_tracking' : 'slide_cancel', {
      accuracy,
      reactionTime: avgComboTime > 0 ? Math.round(avgComboTime / activeCombo.length) : undefined
    });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 text-left">
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Header */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                <Zap className="h-5 w-5 animate-pulse" />
              </span>
              Phase 5: Combo Training
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Master complex inputs in rapid succession. Combo training calibrates high-velocity button rotations, triggers, and D-pad sweeps. Enforce precise muscle memory sequences with strict timing and multiplier streaks.
            </p>
          </section>

          {/* Difficulty Selector */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Select Combo Complexity Level</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['easy', 'medium', 'hard', 'expert'] as ComboDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`py-2 px-4 rounded-xl border text-center transition-all duration-200 uppercase font-bold font-display text-xs cursor-pointer ${
                    difficulty === diff
                      ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Trial Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-cyan/40 hover:shadow-xl hover:shadow-brand-cyan/5 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                    <Clock className="h-6 w-6" />
                  </div>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider border border-zinc-800 bg-zinc-900 px-2 py-1 rounded text-zinc-400">
                    10 Combos
                  </span>
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Combo Time Trial
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Execute 10 complex button combos as fast as possible. Timing parameters adjust based on combo length. Perfect combos multiply scores.
                </p>
              </div>
              <button
                onClick={() => startGame('timetrial')}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 text-zinc-300 hover:text-brand-cyan text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Start Time Trial
              </button>
            </div>

            {/* Endless Survival Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-magenta/40 hover:shadow-xl hover:shadow-brand-magenta/5 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/20">
                    <Flame className="h-6 w-6 animate-pulse" />
                  </div>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider border border-zinc-800 bg-zinc-900 px-2 py-1 rounded text-zinc-400">
                    3 Lives
                  </span>
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Endless Survival Combos
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Survive an endless queue of button combos. Timeouts or incorrect inputs cost lives. The sequence gets progressively faster as your streak climbs.
                </p>
              </div>
              <button
                onClick={() => startGame('endless')}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-magenta/50 hover:bg-brand-magenta/5 text-zinc-300 hover:text-brand-magenta text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Start Survival Run
              </button>
            </div>
          </div>

          {/* History Widget */}
          {historyLogs.length > 0 && (
            <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                Combo Calibration Logs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-bold tracking-wider">
                      <th className="py-2.5">Date</th>
                      <th>Mode</th>
                      <th>Complexity</th>
                      <th>Accuracy</th>
                      <th>Max Streak</th>
                      <th>Avg Speed</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                    {historyLogs.map((log, index) => (
                      <tr key={index}>
                        <td className="py-3 text-zinc-500">{log.date}</td>
                        <td className="font-bold text-white uppercase font-display text-[10px] tracking-wide">{getModeLabel(log.gameMode)}</td>
                        <td className="uppercase font-semibold text-zinc-400 font-display text-[9px]">{log.difficulty}</td>
                        <td className={log.accuracy >= 90 ? 'text-brand-green' : 'text-zinc-300'}>{log.accuracy}%</td>
                        <td className="font-mono text-zinc-300">x{log.maxStreak}</td>
                        <td className="font-mono text-zinc-400">{log.avgComboTime} ms</td>
                        <td className="font-mono text-brand-cyan font-bold">{log.score} PTS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <span className="text-xs font-semibold text-brand-cyan uppercase tracking-widest font-display animate-pulse">
            Configuring Combo Presets...
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-cyan flex items-center justify-center text-white text-5xl font-black font-display animate-spin shadow-2xl shadow-brand-cyan/5">
            <span className="animate-pulse">{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Level: {difficulty.toUpperCase()} | Mode: {activeGameMode ? getModeLabel(activeGameMode).toUpperCase() : ''}
          </p>
        </div>
      )}

      {/* Game Playing Screen */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main combo sequence display panel */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[520px]">
            {/* HUD Status Bar */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">
                  Active Combo Protocol: <span className="text-white">{difficulty.toUpperCase()}</span>
                </span>

                {activeGameMode === 'endless' && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((l) => (
                      <div
                        key={l}
                        className={`h-3 w-3 rounded-full ${
                          l <= lives ? 'bg-brand-magenta shadow-[0_0_6px_#ff007f]' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-[10px] font-bold font-display uppercase tracking-wider items-center">
                {activeGameMode === 'timetrial' ? (
                  <span className="text-zinc-400">Combo {round} / {maxRounds}</span>
                ) : (
                  <span className="text-brand-purple">Combo Wave: {round}</span>
                )}
                <span className="text-brand-cyan">Score: {score}</span>
              </div>
            </div>

            {/* Horizontal Combo Sequence Cards */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-2 py-6 px-4 bg-zinc-900/30 border border-zinc-900/60 rounded-2xl relative overflow-hidden min-h-[120px]">
                {activeCombo.map((btn, index) => {
                  const isPast = index < currentStep;
                  const isActive = index === currentStep;

                  let stepColorClass = 'border-zinc-800 text-zinc-500 bg-zinc-900/20';
                  if (isActive) {
                    stepColorClass = 'border-brand-cyan text-brand-cyan bg-brand-cyan/5 shadow-[0_0_15px_rgba(0,240,255,0.2)] animate-pulse';
                  } else if (isPast) {
                    stepColorClass = 'border-brand-green text-brand-green bg-brand-green/5';
                  }

                  // Check if this step just registered a feedback click
                  const hasClickFeedback = inputFeedback?.index === index;
                  if (hasClickFeedback) {
                    if (inputFeedback.status === 'correct') {
                      stepColorClass = 'border-brand-green text-brand-green bg-brand-green/20 scale-105 duration-100';
                    } else {
                      stepColorClass = 'border-red-500 text-red-500 bg-red-500/20 animate-shake scale-95 duration-100';
                    }
                  }

                  return (
                    <React.Fragment key={index}>
                      <div className={`px-4 py-2.5 rounded-xl border font-black font-display text-sm flex items-center justify-center gap-1.5 transition-all duration-200 min-w-[64px] ${stepColorClass}`}>
                        <span>{btn}</span>
                        {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />}
                      </div>
                      {index < activeCombo.length - 1 && (
                        <span className={`text-zinc-700 font-bold select-none text-base transition-colors ${isPast ? 'text-brand-green' : ''}`}>
                          ➔
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Combo Success Feedback overlays */}
                {comboCompletedFeedback && (
                  <div className="absolute inset-0 bg-brand-green/5 backdrop-blur-xs flex items-center justify-center animate-fade-in z-20">
                    <span className={`text-xl font-black font-display uppercase tracking-widest ${
                      comboCompletedFeedback === 'perfect' ? 'text-yellow-400 text-glow-cyan animate-bounce' : 'text-brand-green'
                    }`}>
                      {comboCompletedFeedback === 'perfect' ? '⚡ PERFECT SPEED! ⚡' : '➔ COMBO COMPLETED!'}
                    </span>
                  </div>
                )}
              </div>

              {/* Ticking Limit bar */}
              <div className="space-y-1 text-right">
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/60">
                  <div
                    className={`h-full transition-all duration-75 ${
                      (timeLeft / speedLimit) < 0.35 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-brand-cyan to-brand-purple'
                    }`}
                    style={{ width: `${(timeLeft / speedLimit) * 100}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono font-semibold text-zinc-500">{(timeLeft/1000).toFixed(2)}s / {(speedLimit/1000).toFixed(2)}s</span>
              </div>
            </div>

            {/* Interactive Controller visualization */}
            <div className="flex-1 flex items-center justify-center py-4 min-h-[260px]">
              <ControllerView
                hidePanel={true}
                highlightedButton={activeCombo[currentStep]}
                onButtonClick={handleInput}
                className="max-w-[360px]"
              />
            </div>

            <div className="text-zinc-500 text-[9px] text-center border-t border-zinc-900/60 pt-3 uppercase font-bold tracking-widest">
              TAP OR PRESS HIGHLIGHTED BUTTON: {activeCombo[currentStep]}
            </div>
          </div>

          {/* Telemetry sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Calibration Lab Telemetry
                </h3>
              </div>

              <div className="space-y-5 flex-1">
                {/* Streak widget */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center relative overflow-hidden flex flex-col items-center justify-center gap-1">
                  <div className="absolute inset-0 bg-brand-cyan/2 blur-lg pointer-events-none" />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-display">Combo Streak</span>
                  
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Flame className={`h-6 w-6 ${currentStreak > 0 ? 'text-red-500 animate-bounce' : 'text-zinc-700'}`} />
                    <span className={`text-3xl font-black font-display ${currentStreak > 0 ? 'text-white' : 'text-zinc-600'}`}>
                      x{currentStreak}
                    </span>
                  </div>

                  {currentStreak >= 3 && (
                    <span className="text-[8px] font-extrabold text-brand-cyan uppercase tracking-wider mt-1 animate-pulse font-display">
                      STREAK BONUS ACTIVE (x{Math.floor(currentStreak / 3) + 1})
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Drill Ratio</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Successful Combos</span>
                    <span className="text-xs font-black text-white font-display uppercase">
                      {successfulCombos} / {totalCombosAttempted}
                    </span>
                  </div>
                </div>

                {/* Accuracy */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Inputs Accuracy</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Correct Taps</span>
                    <span className="text-xs font-black text-brand-cyan font-mono uppercase">
                      {totalInputs > 0 ? Math.round((correctInputs / totalInputs) * 100) : 100}%
                    </span>
                  </div>
                </div>

                {/* Live mistake tracker logs */}
                {mistakeLogs.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Calibration Incidents</span>
                    <div className="p-3 bg-zinc-900/45 border border-zinc-800/80 rounded-xl space-y-1.5 font-mono text-[8px] max-h-28 overflow-y-auto leading-normal">
                      {mistakeLogs.map((log, index) => (
                        <div key={index} className="text-red-400 border-b border-zinc-900/40 pb-1">
                          ➔ {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="h-4.5 w-4.5 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal">
                  <strong>Combo calibration:</strong> Pressing a wrong button resets sequence progress to step 1 of this combo. Speed parameters scale dynamically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Results screen */}
      {gameState === 'completed' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan flex items-center justify-center shadow-lg shadow-brand-cyan/5 animate-pulse">
              <Award className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black font-display text-white uppercase tracking-wider">
              Combo Protocol Complete
            </h2>
            <p className="text-xs text-zinc-500">System registers and calibration charts synced.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* Score */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Score</span>
              <span className="text-lg font-black font-display text-brand-cyan text-glow-cyan font-mono block">
                {score}
              </span>
              <span className="block text-[8px] text-zinc-500">PTS</span>
            </div>

            {/* Combos Ratio */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Combos Done</span>
              <span className="text-lg font-black font-display text-white font-mono block">
                {successfulCombos}/{totalCombosAttempted}
              </span>
              <span className="block text-[8px] text-zinc-500">success ratio</span>
            </div>

            {/* Accuracy */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Taps Acc</span>
              <span className="text-lg font-black font-display text-brand-purple block">
                {totalInputs > 0 ? Math.round((correctInputs / totalInputs) * 100) : 0}%
              </span>
              <span className="block text-[8px] text-zinc-500">precision rating</span>
            </div>

            {/* Max Streak */}
            <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Peak Streak</span>
              <span className="text-lg font-black font-display text-glow-purple text-brand-magenta block">
                x{maxStreak}
              </span>
              <span className="block text-[8px] text-zinc-500">streak combos</span>
            </div>
          </div>

          {/* XP Rewards */}
          <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan">
                <Activity className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">XP and performance ratings synced to operative file.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-cyan uppercase tracking-wider font-display">
              +{Math.min(300, 50 + Math.round(score * 0.05) + maxStreak * 5)} XP SECURED
            </span>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => startGame(activeGameMode!)}
              className="px-6 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run Protocol
            </button>
            <button
              onClick={() => {
                setActiveGameMode(null);
                setGameState('idle');
              }}
              className="px-8 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Back to Training Base
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
