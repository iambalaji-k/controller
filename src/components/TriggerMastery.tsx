import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useGamepad } from '../hooks/useGamepad';
import { ControllerView } from './ControllerView';
import { Gauge, Music, Layers, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

type TriggerMode = 'rhythm' | 'pressure' | 'combos';

interface SessionResult {
  date: string;
  mode: TriggerMode;
  accuracy: number;
  avgResponse: number;
}

export const TriggerMastery: React.FC = () => {
  const { triggerHaptic, logDrillSession } = useApp();
  const gamepad = useGamepad();

  // Mode state
  const [activeMode, setActiveMode] = useState<TriggerMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const maxRounds = 10;

  // Drills state
  const [prompt, setPrompt] = useState<'LT' | 'RT' | 'LT+RT'>('LT');
  const [targetPressure, setTargetPressure] = useState<number>(0.5); // For pressure control
  const [correctHits, setCorrectHits] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SessionResult[]>([]);

  // Mouse fallback trigger states
  const [mouseLt, setMouseLt] = useState<number>(0);
  const [mouseRt, setMouseRt] = useState<number>(0);

  const roundStartTimeRef = useRef(0);
  const loopRef = useRef<number | null>(null);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_trigger_history');
    if (saved) {
      try { setHistoryLogs(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveResult = (result: SessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_trigger_history', JSON.stringify(nextLogs));
  };

  // Start countdown
  const startDrill = (mode: TriggerMode) => {
    setActiveMode(mode);
    setGameState('countdown');
    setCountdown(3);
    setRound(1);
    setCorrectHits(0);
    setTotalAttempts(0);
    setSpeeds([]);
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

    if (activeMode === 'rhythm') {
      // Alternate LT and RT
      setPrompt((prev) => (prev === 'LT' ? 'RT' : 'LT'));
    } else if (activeMode === 'pressure') {
      setPrompt(Math.random() > 0.5 ? 'LT' : 'RT');
      // Set target pressure preset (0.25, 0.50, 0.75, 1.00)
      const presets = [0.25, 0.50, 0.75, 1.00];
      setTargetPressure(presets[Math.floor(Math.random() * presets.length)]);
    } else {
      // Combos: LT, RT, or LT+RT
      const comboPrompts = ['LT', 'RT', 'LT+RT'] as const;
      setPrompt(comboPrompts[Math.floor(Math.random() * comboPrompts.length)]);
    }
  };

  // Main monitoring loop for analog trigger values (especially pressure)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkInputValues = () => {
      const currentLt = gamepad.connected ? (gamepad.buttonValues['LT'] || 0) : mouseLt;
      const currentRt = gamepad.connected ? (gamepad.buttonValues['RT'] || 0) : mouseRt;
      const timeElapsed = performance.now() - roundStartTimeRef.current;

      if (activeMode === 'pressure') {
        const activeTriggerVal = prompt === 'LT' ? currentLt : currentRt;
        const tolerance = 0.08;
        const reachedTarget = Math.abs(activeTriggerVal - targetPressure) <= tolerance;

        // If target is 1.0, allow slightly wider margin
        const isOneTarget = targetPressure === 1.0 && activeTriggerVal >= 0.92;

        if (reachedTarget || isOneTarget) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        }
      } else if (activeMode === 'rhythm') {
        const isLtTarget = prompt === 'LT';
        const clickedLt = currentLt >= 0.85;
        const clickedRt = currentRt >= 0.85;

        if ((isLtTarget && clickedLt) || (!isLtTarget && clickedRt)) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        } else if ((isLtTarget && clickedRt) || (!isLtTarget && clickedLt)) {
          // Wrong trigger pressed!
          triggerHaptic('incorrect');
          setTotalAttempts((prev) => prev + 1);
          setupNextRound(round + 1);
          return;
        }
      } else if (activeMode === 'combos') {
        const hasLt = currentLt >= 0.85;
        const hasRt = currentRt >= 0.85;

        if (prompt === 'LT+RT' && hasLt && hasRt) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        } else if (prompt === 'LT' && hasLt && !hasRt) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        } else if (prompt === 'RT' && hasRt && !hasLt) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        }
      }

      loopRef.current = requestAnimationFrame(checkInputValues);
    };

    loopRef.current = requestAnimationFrame(checkInputValues);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameState, prompt, targetPressure, gamepad.buttonValues, mouseLt, mouseRt]);

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
    logDrillSession('reaction_snap', {
      accuracy,
      reactionTime: avgResponse > 0 ? avgResponse : undefined,
    });
  };

  const getModeTitle = (mode: TriggerMode) => {
    switch (mode) {
      case 'rhythm': return 'Trigger Rhythm Alternation';
      case 'pressure': return 'Trigger Pressure Sensitivity';
      case 'combos': return 'Trigger Combination Pulled';
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 text-left relative overflow-hidden">
      {gameState === 'idle' && (
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <Gauge className="h-5 w-5 text-brand-cyan" />
              Phase 6: Trigger Mastery Protocols
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Calibrate trigger depth pressure curves and coordinate left/right index responses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode 1 */}
            <button
              onClick={() => startDrill('rhythm')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-cyan/40 hover:bg-brand-cyan/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Music className="h-6 w-6 text-brand-cyan mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Trigger Rhythm</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Alternate pulling LT and RT to develop rhythmic index speed.
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>

            {/* Mode 2 */}
            <button
              onClick={() => startDrill('pressure')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-purple/40 hover:bg-brand-purple/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Gauge className="h-6 w-6 text-brand-purple mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Pressure Control</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Pull triggers to precise pressure intervals (e.g. 50%, 75%).
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-purple uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>

            {/* Mode 3 */}
            <button
              onClick={() => startDrill('combos')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-magenta/40 hover:bg-brand-magenta/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Layers className="h-6 w-6 text-brand-magenta mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Trigger Combos</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Execute LT + RT triggers simultaneously or in combos.
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
          {/* Dashboard HUD */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex justify-between text-xs font-bold text-zinc-400 border-b border-zinc-900 pb-2.5">
              <span>{getModeTitle(activeMode!)}</span>
              <span>Round {round} / {maxRounds}</span>
            </div>

            {/* Main Prompt */}
            <div className="bg-zinc-900/30 border border-zinc-850 p-6 rounded-2xl text-center space-y-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Target Pull</span>
              
              {activeMode === 'pressure' ? (
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-brand-purple font-display uppercase tracking-wider">
                    PULL {prompt} TO {Math.round(targetPressure * 100)}%
                  </h3>
                  <div className="flex justify-center items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Current Pressure:</span>
                    <span className="text-[10px] text-brand-purple font-mono font-bold">
                      {Math.round((prompt === 'LT' ? (gamepad.connected ? gamepad.buttonValues['LT'] : mouseLt) : (gamepad.connected ? gamepad.buttonValues['RT'] : mouseRt)) * 100)}%
                    </span>
                  </div>
                </div>
              ) : (
                <h3 className="text-3xl font-black text-brand-cyan font-display uppercase tracking-widest animate-pulse">
                  {prompt === 'LT+RT' ? 'LT + RT' : prompt}
                </h3>
              )}

              {/* Slider fallback (only show if no gamepad connected) */}
              {!gamepad.connected && activeMode === 'pressure' && (
                <div className="space-y-2 pt-4 border-t border-zinc-900/60">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 font-display block">Simulation Slide Pull</span>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={prompt === 'LT' ? mouseLt : mouseRt}
                    onChange={(e) => {
                      if (prompt === 'LT') setMouseLt(Number(e.target.value));
                      else setMouseRt(Number(e.target.value));
                    }}
                    onMouseUp={() => {
                      setMouseLt(0);
                      setMouseRt(0);
                    }}
                    className="w-full accent-brand-purple bg-zinc-950 rounded-lg appearance-none h-1.5"
                  />
                </div>
              )}

              {!gamepad.connected && activeMode !== 'pressure' && (
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-zinc-900/60">
                  <button
                    onMouseDown={() => setMouseLt(1)}
                    onMouseUp={() => setMouseLt(0)}
                    className="py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-[10px] font-bold font-display uppercase hover:border-zinc-700 text-zinc-300"
                  >
                    Pull LT (Mouse Hold)
                  </button>
                  <button
                    onMouseDown={() => setMouseRt(1)}
                    onMouseUp={() => setMouseRt(0)}
                    className="py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-[10px] font-bold font-display uppercase hover:border-zinc-700 text-zinc-300"
                  >
                    Pull RT (Mouse Hold)
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-[10px] text-zinc-500 leading-normal flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
              <span>
                {activeMode === 'pressure' ? 'Gently pull the trigger until the current value falls within ±8% of the target index.' : 'Complete prompts as quickly as possible. Time starts immediately.'}
              </span>
            </div>
          </div>

          {/* Controller View */}
          <div className="lg:col-span-7 flex flex-col justify-center py-6 min-h-[300px]">
            <ControllerView
              hidePanel={true}
              highlightedButton={prompt === 'LT+RT' ? null : prompt}
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
