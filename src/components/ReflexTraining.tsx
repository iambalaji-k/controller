import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { Flame, Heart, Trophy, Zap, ShieldAlert, RotateCcw, ChevronRight } from 'lucide-react';

type ReflexMode = 'rapidfire' | 'survival';

interface LeaderboardEntry {
  name: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  date: string;
}

interface LeaderboardData {
  rapidfire: LeaderboardEntry[];
  survival: LeaderboardEntry[];
}

const REFLEX_BUTTONS: ButtonKey[] = [
  'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT',
  'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'
];

export const ReflexTraining: React.FC = () => {
  const { profile, logDrillSession, triggerHaptic, stats } = useApp();
  const [mistakeHistory, setMistakeHistory] = useState<Record<string, number>>({});

  const getModeLabel = (mode: ReflexMode) => {
    return mode === 'rapidfire' ? 'Rapid Fire Sprint' : 'Survival Endurance';
  };

  // Game configuration states
  const [activeMode, setActiveMode] = useState<ReflexMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const maxRapidRounds = 25;

  // Active metrics
  const [prompt, setPrompt] = useState<ButtonKey>('A');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctHits, setCorrectHits] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [xpGained, setXpGained] = useState(0);

  // Speed timer states
  const [speedLimit, setSpeedLimit] = useState(1600); // in ms
  const [timeLeft, setTimeLeft] = useState(1600); // in ms
  
  // Leaderboards
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>({
    rapidfire: [],
    survival: []
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimestampRef = useRef<number>(0);

  // Load leaderboard on mount
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_reflex_leaderboard');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse leaderboard data', e);
      }
    }
  }, []);

  const saveLeaderboard = (mode: ReflexMode, entry: LeaderboardEntry) => {
    setLeaderboard((prev) => {
      const modeList = [...(prev[mode] || []), entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Keep top 10
      
      const nextLeaderboard = { ...prev, [mode]: modeList };
      localStorage.setItem('controller_mastery_reflex_leaderboard', JSON.stringify(nextLeaderboard));
      return nextLeaderboard;
    });
  };

  // Select a random button
  const getNextPrompt = (current: ButtonKey): ButtonKey => {
    const pool = REFLEX_BUTTONS.filter(b => b !== current);
    
    // Adaptive learning: prioritize buttons frequently missed
    const weights: Record<string, number> = {};
    let totalWeight = 0;
    
    pool.forEach((btn) => {
      const mistakes = stats.buttonMistakes?.[btn] || 0;
      weights[btn] = 1 + mistakes;
      totalWeight += weights[btn];
    });
    
    let rand = Math.random() * totalWeight;
    for (const btn of pool) {
      rand -= weights[btn];
      if (rand <= 0) {
        return btn;
      }
    }
    
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Launch the game loops
  const startGame = (mode: ReflexMode) => {
    setActiveMode(mode);
    setGameState('countdown');
    setCountdown(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setRound(1);
    setCorrectHits(0);
    setTotalAttempts(0);
    setSpeeds([]);
    setLives(mode === 'survival' ? 3 : 0);
    setSpeedLimit(mode === 'rapidfire' ? 1600 : 2000);
    setMistakeHistory({});
  };

  // Countdown handler
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        interval = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        setupRound(1, 'A');
      }
    }
    return () => clearTimeout(interval);
  }, [gameState, countdown]);

  // Setup round logic
  const setupRound = (roundNum: number, currentButton: ButtonKey) => {
    if (gameState === 'completed') return;

    // Terminate Rapid Fire if 25 rounds complete
    if (activeMode === 'rapidfire' && roundNum > maxRapidRounds) {
      handleGameOver();
      return;
    }

    setRound(roundNum);
    const nextBtn = getNextPrompt(currentButton);
    setPrompt(nextBtn);

    // Calculate time limit for this round
    let limit = speedLimit;
    if (activeMode === 'rapidfire') {
      // Shaves 45ms off every round
      limit = Math.max(500, 1600 - (roundNum - 1) * 45);
    } else if (activeMode === 'survival') {
      // Shaves 35ms off for every correct hit registered
      limit = Math.max(450, 2000 - correctHits * 35);
    }

    setSpeedLimit(limit);
    setTimeLeft(limit);
    startTimestampRef.current = performance.now();

    // Start ticks interval
    if (timerRef.current) clearInterval(timerRef.current);
    const tickRate = 20; // tick every 20ms
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - tickRate;
        if (nextTime <= 0) {
          handleTimeOut(nextBtn);
          return 0;
        }
        return nextTime;
      });
    }, tickRate);
  };

  // Handle prompt timeout (too slow)
  const handleTimeOut = (expiredPrompt: ButtonKey) => {
    if (timerRef.current) clearInterval(timerRef.current);
    triggerHaptic('incorrect');

    setCombo(0);
    setTotalAttempts(prev => prev + 1);
    setMistakeHistory(prev => ({ ...prev, [expiredPrompt]: (prev[expiredPrompt] || 0) + 1 }));

    if (activeMode === 'survival') {
      setLives((prev) => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          handleGameOver();
          return 0;
        }
        setupRound(round + 1, expiredPrompt);
        return nextLives;
      });
    } else {
      setupRound(round + 1, expiredPrompt);
    }
  };

  // Process user input (gamepad or SVG click)
  const handleInput = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing') return;

    const reactionTime = Math.round(performance.now() - startTimestampRef.current);

    if (clickedButton === prompt) {
      // Correct Input!
      if (timerRef.current) clearInterval(timerRef.current);
      
      setCorrectHits(prev => prev + 1);
      setTotalAttempts(prev => prev + 1);
      setSpeeds(prev => [...prev, reactionTime]);

      // Calculate score bonus: remaining time + combo multipliers
      const basePoints = 100;
      const speedBonus = Math.round((timeLeft / speedLimit) * 100);
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);

      const multiplier = Math.floor(nextCombo / 5) + 1; // 1x, 2x for every 5 hits
      const roundScore = (basePoints + speedBonus) * multiplier;
      setScore(prev => prev + roundScore);

      // Trigger crisp success vibration
      // Trigger combo rumble every 5 hits
      if (nextCombo % 5 === 0) {
        triggerHaptic('combo');
      } else {
        triggerHaptic('correct');
      }

      // Proceed
      setupRound(round + 1, prompt);
    } else {
      // Wrong Button Clicked!
      if (timerRef.current) clearInterval(timerRef.current);
      triggerHaptic('incorrect');

      setCombo(0);
      setTotalAttempts(prev => prev + 1);
      setMistakeHistory(prev => ({ ...prev, [prompt]: (prev[prompt] || 0) + 1 }));

      if (activeMode === 'survival') {
        setLives((prev) => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            handleGameOver();
            return 0;
          }
          setupRound(round + 1, prompt);
          return nextLives;
        });
      } else {
        setupRound(round + 1, prompt);
      }
    }
  };

  // Game complete routines
  const handleGameOver = () => {
    setGameState('completed');
    if (timerRef.current) clearInterval(timerRef.current);

    const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0;
    const avgResponse = speeds.length > 0 ? Math.round(speeds.reduce((a,b)=>a+b,0) / speeds.length) : 0;

    const entry: LeaderboardEntry = {
      name: profile.username,
      score,
      maxCombo,
      accuracy,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    };

    saveLeaderboard(activeMode!, entry);

    // Sync XP to core profile systems
    // Base XP is calculated as 10% of score for Rapid, 15% for survival, plus combo bonuses!
    const baseReward = activeMode === 'rapidfire' ? Math.round(score * 0.1) : Math.round(score * 0.15);
    const finalXp = Math.max(50, Math.min(300, baseReward + maxCombo * 4));
    setXpGained(finalXp);

    // Log the session stats
    logDrillSession(activeMode === 'rapidfire' ? 'target_snap' : 'reaction_snap', {
      accuracy,
      reactionTime: avgResponse > 0 ? avgResponse : undefined,
      buttonMistakes: mistakeHistory
    });
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 text-left">
      
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Landing Header */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-magenta/15 border border-brand-magenta/30 text-brand-magenta">
                <Flame className="h-5 w-5 animate-pulse" />
              </span>
              Phase 2: Reflex Protocols
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Accelerate response pathways. Reflex mode introduces speed scaling, combo multiplier mechanics, and survival thresholds. Log combos and survive high-frequency prompts to establish aim priority.
            </p>
          </section>

          {/* Practice card selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rapid Fire Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-purple/40 hover:shadow-xl hover:shadow-brand-purple/5 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                    <Zap className="h-6 w-6" />
                  </div>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider border border-zinc-800 bg-zinc-900 px-2 py-1 rounded text-zinc-400">
                    25 Rounds
                  </span>
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Rapid Fire Sprint
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Sustain speed under time decay. Prompt timeouts shrink by 45ms every round. Log multipliers and accuracy vectors to dominate.
                </p>
              </div>
              <button
                onClick={() => startGame('rapidfire')}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-purple/50 hover:bg-brand-purple/5 text-zinc-300 hover:text-brand-purple text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Speed Sprint
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Survival Mode Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-magenta/40 hover:shadow-xl hover:shadow-brand-magenta/5 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/20">
                    <Heart className="h-6 w-6 fill-brand-magenta" />
                  </div>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider border border-zinc-800 bg-zinc-900 px-2 py-1 rounded text-zinc-400">
                    3 Lives
                  </span>
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Survival Endurance
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Infinite prompt cascade. Prompts accelerate by 35ms with every success down to a 450ms floor. Three mistakes/timeouts close the protocol.
                </p>
              </div>
              <button
                onClick={() => startGame('survival')}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-magenta/50 hover:bg-brand-magenta/5 text-zinc-300 hover:text-brand-magenta text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Survival Run
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* Leaderboards widget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rapid Fire leaderboard */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-purple flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                Rapid Fire Leaderboard
              </h3>
              
              <div className="space-y-1.5 text-xs">
                {leaderboard.rapidfire.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 uppercase font-bold text-[9px]">Awaiting Records</div>
                ) : (
                  leaderboard.rapidfire.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-zinc-900/35 border border-zinc-900/50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-500 font-mono w-4">#{idx+1}</span>
                        <span className="font-bold text-white">{entry.name}</span>
                      </div>
                      <div className="flex gap-4 font-mono text-[10px]">
                        <span className="text-zinc-500">x{entry.maxCombo} Combo</span>
                        <span className="text-brand-purple font-bold">{entry.score} PTS</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Survival Leaderboard */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-magenta flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                Survival Leaderboard
              </h3>
              
              <div className="space-y-1.5 text-xs">
                {leaderboard.survival.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 uppercase font-bold text-[9px]">Awaiting Records</div>
                ) : (
                  leaderboard.survival.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-zinc-900/35 border border-zinc-900/50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-500 font-mono w-4">#{idx+1}</span>
                        <span className="font-bold text-white">{entry.name}</span>
                      </div>
                      <div className="flex gap-4 font-mono text-[10px]">
                        <span className="text-zinc-500">x{entry.maxCombo} Combo</span>
                        <span className="text-brand-magenta font-bold">{entry.score} PTS</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Game Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <span className="text-xs font-semibold text-brand-magenta uppercase tracking-widest font-display animate-pulse">
            Establishing Device Link...
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-magenta flex items-center justify-center text-white text-5xl font-black font-display animate-spin shadow-2xl shadow-brand-magenta/5">
            <span className="animate-pulse">{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Calibrate hands. Multipliers activate on prompt hits.
          </p>
        </div>
      )}

      {/* Game Active Screen */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Visual Board */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[500px]">
            
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">
                  Protocol: <span className="text-white">{getModeLabel(activeMode!)}</span>
                </span>
                
                {/* Lives indicators */}
                {activeMode === 'survival' && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((heart) => (
                      <Heart
                        key={heart}
                        className={`h-4 w-4 ${
                          heart <= lives 
                            ? 'text-brand-magenta fill-brand-magenta drop-shadow-[0_0_6px_rgba(255,0,127,0.6)] animate-pulse'
                            : 'text-zinc-800 fill-zinc-900'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Score and Multiplier */}
              <div className="flex gap-4 text-[10px] font-bold font-display uppercase tracking-wider items-center">
                {activeMode === 'rapidfire' && (
                  <span className="text-zinc-400">Prompt {round} / {maxRapidRounds}</span>
                )}
                <span className="text-zinc-300">SCORE: <span className="font-mono text-white text-xs">{score}</span></span>
              </div>
            </div>

            {/* Timed Prompt Indicator */}
            <div className="space-y-3">
              <div className="text-center py-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">TAP TARGET</span>
                <span className="text-2xl sm:text-3xl font-black text-brand-magenta uppercase tracking-wider font-display animate-pulse">
                  {prompt}
                </span>
              </div>

              {/* Time progress bar */}
              <div className="space-y-1 text-right">
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                  <div
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-magenta transition-all duration-75"
                    style={{ width: `${(timeLeft / speedLimit) * 100}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono font-semibold text-zinc-500">{(timeLeft/1000).toFixed(2)}s / {(speedLimit/1000).toFixed(2)}s</span>
              </div>
            </div>

            {/* Controller drawing */}
            <div className="flex-1 flex items-center justify-center py-4 min-h-[280px]">
              <ControllerView
                hidePanel={true}
                highlightedButton={prompt}
                onButtonClick={handleInput}
                className="max-w-[400px]"
              />
            </div>

            {/* Footer */}
            <div className="text-zinc-500 text-[9px] text-center border-t border-zinc-900/60 pt-3 uppercase font-bold tracking-widest">
              Physical Gamepad inputs or direct layout taps accepted.
            </div>

          </div>

          {/* Sidebar metrics */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live Stats */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between text-left space-y-4">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Telemetry Reflex Stream
                </h3>
              </div>

              <div className="space-y-6 flex-1">
                {/* Combo Multiplier Widget */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center relative overflow-hidden flex flex-col items-center justify-center gap-1">
                  <div className="absolute inset-0 bg-brand-purple/2 blur-lg pointer-events-none" />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-display">Active Combo Stream</span>
                  
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Flame className={`h-6 w-6 ${combo > 0 ? 'text-red-500 animate-bounce' : 'text-zinc-700'}`} />
                    <span className={`text-3xl font-black font-display ${combo > 0 ? 'text-white' : 'text-zinc-600'}`}>
                      x{combo}
                    </span>
                  </div>

                  {combo >= 5 && (
                    <span className="text-[9px] font-extrabold text-brand-cyan uppercase tracking-wider mt-1 animate-pulse font-display">
                      MULTIPLIER UP (x{Math.floor(combo / 5) + 1})!
                    </span>
                  )}
                </div>

                {/* Accuracy */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Accuracy Log</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Taps Logged</span>
                    <span className="text-xs font-black text-white font-display uppercase">{correctHits} / {totalAttempts}</span>
                  </div>
                </div>

                {/* Target Time limits */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Reflex Windows</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Allowable Limit</span>
                    <span className="text-xs font-black text-brand-magenta font-mono uppercase">{speedLimit} ms</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Correct taps log points scaling with leftover timer ticks. Combos add multipliers!
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
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-magenta/10 border border-brand-magenta/20 text-brand-magenta flex items-center justify-center shadow-lg shadow-brand-magenta/5 animate-pulse">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black font-display text-white uppercase tracking-wider">
              Reflex calibration completed
            </h2>
            <p className="text-xs text-zinc-500">High score logs updated in operational files.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Score */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Final Score</span>
              <span className="text-xl font-black font-display text-brand-cyan text-glow-cyan font-mono">
                {score}
              </span>
              <span className="block text-[8px] text-zinc-500">points secured</span>
            </div>

            {/* Accuracy */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Taps Accuracy</span>
              <span className={`text-xl font-black font-display ${
                (correctHits / (totalAttempts || 1)) >= 0.9 ? 'text-brand-green' : 'text-white'
              }`}>
                {totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0}%
              </span>
              <span className="block text-[8px] text-zinc-500">({correctHits}/{totalAttempts} hits)</span>
            </div>

            {/* Max Combo */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Peak Combo</span>
              <span className="text-xl font-black font-display text-brand-purple text-glow-purple font-mono">
                x{maxCombo}
              </span>
              <span className="block text-[8px] text-zinc-500">consecutive hits</span>
            </div>

          </div>

          {/* XP Secures summary */}
          <div className="p-4 bg-brand-purple/5 border border-brand-purple/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-purple/15 text-brand-purple">
                <Flame className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">Score parameters synced to active callsign profile.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-purple uppercase tracking-wider font-display">
              +{xpGained} XP SECURED
            </span>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => startGame(activeMode!)}
              className="px-6 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run Protocol
            </button>
            <button
              onClick={() => {
                setActiveMode(null);
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
