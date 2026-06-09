import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { Compass, Zap, Layers, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

type DpadMode = 'recall' | 'rapid' | 'patterns';

interface SessionResult {
  date: string;
  mode: DpadMode;
  accuracy: number;
  avgResponse: number;
}

const DPAD_BUTTONS: ButtonKey[] = ['DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];

export const DpadMastery: React.FC = () => {
  const { triggerHaptic, logDrillSession } = useApp();

  // Drill states
  const [activeMode, setActiveMode] = useState<DpadMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const maxRounds = 10;

  // Prompts & tracking
  const [prompt, setPrompt] = useState<ButtonKey>('DpadUp');
  const [patternSequence, setPatternSequence] = useState<ButtonKey[]>([]);
  const [patternIndex, setPatternIndex] = useState(0);

  const [correctHits, setCorrectHits] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SessionResult[]>([]);

  const roundStartTimeRef = useRef(0);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_dpad_history');
    if (saved) {
      try { setHistoryLogs(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveResult = (result: SessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_dpad_history', JSON.stringify(nextLogs));
  };

  const startDrill = (mode: DpadMode) => {
    setActiveMode(mode);
    setGameState('countdown');
    setCountdown(3);
    setRound(1);
    setCorrectHits(0);
    setTotalAttempts(0);
    setSpeeds([]);
    setPatternSequence([]);
    setPatternIndex(0);
  };

  // Countdown timer
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        setupNextRound(1);
      }
    }
    return () => clearTimeout(timerId);
  }, [gameState, countdown]);

  const setupNextRound = (roundNum: number) => {
    if (roundNum > maxRounds) {
      handleGameOver();
      return;
    }
    setRound(roundNum);
    roundStartTimeRef.current = performance.now();

    if (activeMode === 'recall' || activeMode === 'rapid') {
      const nextBtn = DPAD_BUTTONS[Math.floor(Math.random() * DPAD_BUTTONS.length)];
      setPrompt(nextBtn);
    } else {
      // Patterns Mode: generate a sequence of 3-4 Dpad directions
      const seqLength = 3;
      const sequence: ButtonKey[] = [];
      for (let i = 0; i < seqLength; i++) {
        sequence.push(DPAD_BUTTONS[Math.floor(Math.random() * DPAD_BUTTONS.length)]);
      }
      setPatternSequence(sequence);
      setPatternIndex(0);
    }
  };

  const handleInput = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing') return;

    // Filter to check only DPAD inputs
    if (!DPAD_BUTTONS.includes(clickedButton)) return;

    const timeElapsed = performance.now() - roundStartTimeRef.current;

    if (activeMode === 'recall' || activeMode === 'rapid') {
      const isCorrect = clickedButton === prompt;

      if (isCorrect) {
        triggerHaptic('correct');
        setCorrectHits((prev) => prev + 1);
        setTotalAttempts((prev) => prev + 1);
        setSpeeds((prev) => [...prev, timeElapsed]);
        setupNextRound(round + 1);
      } else {
        triggerHaptic('incorrect');
        setTotalAttempts((prev) => prev + 1);
        setupNextRound(round + 1);
      }
    } else {
      // Patterns matching evaluation
      const targetBtn = patternSequence[patternIndex];
      const isCorrect = clickedButton === targetBtn;

      if (isCorrect) {
        triggerHaptic('correct');
        const nextIndex = patternIndex + 1;

        if (nextIndex >= patternSequence.length) {
          // Entire pattern complete!
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
        } else {
          setPatternIndex(nextIndex);
        }
      } else {
        // Broke pattern sequence
        triggerHaptic('incorrect');
        setTotalAttempts((prev) => prev + 1);
        setupNextRound(round + 1);
      }
    }
  };

  const handleGameOver = () => {
    setGameState('completed');
    const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0;
    const avgResponse = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

    const result: SessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      mode: activeMode!,
      accuracy,
      avgResponse,
    };
    saveResult(result);

    // Sync XP
    logDrillSession('micro_adjustments', {
      accuracy,
      reactionTime: avgResponse > 0 ? avgResponse : undefined,
    });
  };

  const getDpadButtonLabel = (key: ButtonKey) => {
    switch (key) {
      case 'DpadUp': return 'D-Pad Up';
      case 'DpadDown': return 'D-Pad Down';
      case 'DpadLeft': return 'D-Pad Left';
      case 'DpadRight': return 'D-Pad Right';
      default: return key;
    }
  };

  const getDpadArrowSymbol = (key: ButtonKey) => {
    switch (key) {
      case 'DpadUp': return '▲';
      case 'DpadDown': return '▼';
      case 'DpadLeft': return '◀';
      case 'DpadRight': return '▶';
      default: return '';
    }
  };

  const getModeTitle = (mode: DpadMode) => {
    switch (mode) {
      case 'recall': return 'D-Pad Direction Recall';
      case 'rapid': return 'D-Pad Rapid Fire Navigation';
      case 'patterns': return 'D-Pad Pattern Matching';
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 text-left relative overflow-hidden">
      {gameState === 'idle' && (
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="h-5 w-5 text-brand-cyan" />
              Phase 7: D-Pad Mastery Protocols
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Calibrate navigational D-pad muscle recall and memorize fast combination patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recall */}
            <button
              onClick={() => startDrill('recall')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-cyan/40 hover:bg-brand-cyan/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Compass className="h-6 w-6 text-brand-cyan mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Direction Recall</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Identify and click individual D-pad directions on command.
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>

            {/* Rapid */}
            <button
              onClick={() => startDrill('rapid')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-purple/40 hover:bg-brand-purple/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Zap className="h-6 w-6 text-brand-purple mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Rapid Navigation</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  React instantly to a rapid fire stream of directional commands.
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-purple uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>

            {/* Patterns */}
            <button
              onClick={() => startDrill('patterns')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-magenta/40 hover:bg-brand-magenta/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Layers className="h-6 w-6 text-brand-magenta mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Pattern Matching</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Execute specific D-pad sequences (like street fighting motions).
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-magenta uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>
          </div>

          {/* History */}
          <div className="border-t border-zinc-900 pt-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">Recent Calibration Runs</h3>
            {historyLogs.length === 0 ? (
              <p className="text-[10px] text-zinc-600">No logs found in this configuration.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {historyLogs.slice(0, 4).map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs">
                    <div>
                      <span className="font-extrabold text-zinc-300 font-display">{getModeTitle(log.mode)}</span>
                      <span className="block text-[9px] text-zinc-500">{log.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-brand-cyan">{log.accuracy}% Acc</span>
                      <span className="block text-[9px] text-zinc-500">{log.avgResponse}ms speed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-zinc-950 border border-brand-purple flex items-center justify-center text-white text-3xl font-black font-display animate-ping">
            {countdown}
          </div>
          <p className="text-xs uppercase font-extrabold text-brand-purple tracking-widest font-display">Starting Calibration Protocol...</p>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* HUD Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex justify-between text-xs font-bold text-zinc-400 border-b border-zinc-900 pb-2.5">
              <span>{getModeTitle(activeMode!)}</span>
              <span>Round {round} / {maxRounds}</span>
            </div>

            {/* Prompt View */}
            <div className="bg-zinc-900/30 border border-zinc-850 p-6 rounded-2xl text-center space-y-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Action Prompt</span>
              
              {activeMode === 'patterns' ? (
                <div className="space-y-4">
                  <div className="flex justify-center gap-3">
                    {patternSequence.map((seqBtn, idx) => {
                      const isCompleted = idx < patternIndex;
                      const isActive = idx === patternIndex;
                      return (
                        <div 
                          key={idx}
                          className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black font-display border transition-all ${
                            isCompleted ? 'border-brand-green bg-brand-green/10 text-brand-green' :
                            isActive ? 'border-brand-magenta bg-brand-magenta/10 text-brand-magenta animate-pulse scale-105' :
                            'border-zinc-800 bg-zinc-950 text-zinc-600'
                          }`}
                        >
                          {getDpadArrowSymbol(seqBtn)}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold block uppercase">
                    Press: {getDpadButtonLabel(patternSequence[patternIndex])}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-brand-cyan font-display uppercase tracking-widest animate-pulse">
                    {getDpadArrowSymbol(prompt)} {getDpadButtonLabel(prompt)}
                  </h3>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Tap direction on controller
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-[10px] text-zinc-500 leading-normal flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
              <span>
                {activeMode === 'rapid' ? 'Rapid Fire is extremely fast! Focus on pure reflex response.' : 'Match the directions sequentially without looking down.'}
              </span>
            </div>
          </div>

          {/* Interactive Controller */}
          <div className="lg:col-span-7 flex flex-col justify-center py-6 min-h-[300px]">
            <ControllerView
              hidePanel={true}
              highlightedButton={activeMode === 'patterns' ? patternSequence[patternIndex] : prompt}
              onButtonClick={handleInput}
              className="max-w-[420px] mx-auto"
            />
          </div>
        </div>
      )}

      {gameState === 'completed' && (
        <div className="py-10 text-center max-w-md mx-auto space-y-6">
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center text-brand-green">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-white font-display uppercase tracking-wider mt-4">Calibration Session Synced!</h3>
            <p className="text-xs text-zinc-500 mt-1">Data logged to telemetry registry files.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl text-left">
            <div>
              <span className="block text-[10px] uppercase font-bold text-zinc-500 font-display">Drill Accuracy</span>
              <span className="text-2xl font-black text-white font-display">{totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0}%</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-zinc-500 font-display">Average Response</span>
              <span className="text-2xl font-black text-brand-cyan font-display">
                {speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0}ms
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => startDrill(activeMode!)}
              className="flex-1 py-3 bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 font-black font-display text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Recalibrate
            </button>
            <button
              onClick={() => {
                setActiveMode(null);
                setGameState('idle');
              }}
              className="flex-1 py-3 border border-zinc-800 bg-zinc-900/40 text-zinc-300 font-bold font-display text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-900/60 transition-all cursor-pointer"
            >
              Exit Module
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
