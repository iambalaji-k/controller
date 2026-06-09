import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useGamepad } from '../hooks/useGamepad';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { ShieldAlert, Zap, Compass, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

type ClickMode = 'basic' | 'coordination' | 'rhythm';

interface SessionResult {
  date: string;
  mode: ClickMode;
  accuracy: number;
  avgResponse: number;
}

export const StickClickMastery: React.FC = () => {
  const { triggerHaptic, logDrillSession } = useApp();
  const gamepad = useGamepad();

  // Drill configuration
  const [activeMode, setActiveMode] = useState<ClickMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const maxRounds = 10;

  // Prompts
  const [prompt, setPrompt] = useState<'L3' | 'R3' | 'L3+LS_UP' | 'R3+RS_DOWN'>('L3');
  const [correctHits, setCorrectHits] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SessionResult[]>([]);

  const roundStartTimeRef = useRef(0);
  const loopRef = useRef<number | null>(null);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_click_history');
    if (saved) {
      try { setHistoryLogs(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveResult = (result: SessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_click_history', JSON.stringify(nextLogs));
  };

  const startDrill = (mode: ClickMode) => {
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

    if (activeMode === 'basic') {
      setPrompt(Math.random() > 0.5 ? 'L3' : 'R3');
    } else if (activeMode === 'rhythm') {
      // Alternate L3 and R3 click rhythm
      setPrompt((prev) => (prev === 'L3' ? 'R3' : 'L3'));
    } else {
      // Coordination: Sprint (L3 + LS UP) or Crouch aim zoom (R3 + RS DOWN)
      const options = ['L3+LS_UP', 'R3+RS_DOWN'] as const;
      setPrompt(options[Math.floor(Math.random() * options.length)]);
    }
  };

  // Click & Direction polling loop (runs at 60fps when playing coordination mode)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkAnalogCoordination = () => {
      const timeElapsed = performance.now() - roundStartTimeRef.current;

      if (activeMode === 'coordination') {
        const clickedL3 = gamepad.connected ? gamepad.buttons['L3'] : false;
        const clickedR3 = gamepad.connected ? gamepad.buttons['R3'] : false;
        const axesLS_Y = gamepad.connected ? gamepad.axes[1] : 0; // LS Y (-1 is full UP)
        const axesRS_Y = gamepad.connected ? gamepad.axes[3] : 0; // RS Y (1 is full DOWN)

        if (prompt === 'L3+LS_UP' && clickedL3 && axesLS_Y <= -0.7) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        } else if (prompt === 'R3+RS_DOWN' && clickedR3 && axesRS_Y >= 0.7) {
          triggerHaptic('correct');
          setCorrectHits((prev) => prev + 1);
          setTotalAttempts((prev) => prev + 1);
          setSpeeds((prev) => [...prev, timeElapsed]);
          setupNextRound(round + 1);
          return;
        }
      }

      loopRef.current = requestAnimationFrame(checkAnalogCoordination);
    };

    loopRef.current = requestAnimationFrame(checkAnalogCoordination);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameState, prompt, gamepad.buttons, gamepad.axes]);

  // Click handler for basic/rhythm (or mouse clicks)
  const handleInput = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing') return;

    // Ignore joystick clicks in coordination mode as they are polled continuously
    if (activeMode === 'coordination') return;

    const timeElapsed = performance.now() - roundStartTimeRef.current;

    // L3 click maps from 'L3', R3 maps from 'R3'
    if (clickedButton === 'L3' || clickedButton === 'R3') {
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

  const getPromptLabel = () => {
    if (prompt === 'L3') return 'Click Left Stick (L3)';
    if (prompt === 'R3') return 'Click Right Stick (R3)';
    if (prompt === 'L3+LS_UP') return 'SPRINT: L3 + Push LS Up';
    if (prompt === 'R3+RS_DOWN') return 'ZOOM: R3 + Pull RS Down';
    return prompt;
  };

  const getModeTitle = (mode: ClickMode) => {
    switch (mode) {
      case 'basic': return 'L3 / R3 Identification';
      case 'coordination': return 'Stick Click & Move Coordination';
      case 'rhythm': return 'Alternating Click Rhythm';
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 text-left relative overflow-hidden">
      {gameState === 'idle' && (
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-brand-cyan" />
              Phase 8: Stick Click Mastery Protocols (L3 & R3)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Overcome the beginner obstacle of clicking sticks while aiming, moving, or panning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic */}
            <button
              onClick={() => startDrill('basic')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-cyan/40 hover:bg-brand-cyan/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <ShieldAlert className="h-6 w-6 text-brand-cyan mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">L3 / R3 Clicks</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Identify and respond rapidly to individual stick click signals.
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>

            {/* Coordination */}
            <button
              onClick={() => startDrill('coordination')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-purple/40 hover:bg-brand-purple/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Compass className="h-6 w-6 text-brand-purple mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Click & Move</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Combine stick clicks with specific directional tilts (LS/RS).
                </p>
              </div>
              <span className="text-[9px] font-bold text-brand-purple uppercase tracking-wider">Launch protocol &rarr;</span>
            </button>

            {/* Rhythm */}
            <button
              onClick={() => startDrill('rhythm')}
              className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-brand-magenta/40 hover:bg-brand-magenta/5 text-left transition-all duration-300 group flex flex-col justify-between h-40 cursor-pointer"
            >
              <div>
                <Zap className="h-6 w-6 text-brand-magenta mb-2 group-hover:scale-105 transition-transform" />
                <h3 className="text-sm font-bold text-white uppercase font-display">Click Rhythm</h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Coordinate fast left/right alternating click sequences.
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
              
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-brand-cyan font-display uppercase tracking-wider animate-pulse">
                  {getPromptLabel()}
                </h3>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Tap stick button click down
                </span>
              </div>

              {/* Slider/Mouse Fallback for Coordination (When physical controller is disconnected) */}
              {!gamepad.connected && activeMode === 'coordination' && (
                <div className="space-y-4 pt-4 border-t border-zinc-900/60">
                  <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 text-left">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 font-display block">Simulation Click Triggers (Mouse Only)</span>
                    
                    {prompt === 'L3+LS_UP' ? (
                      <button
                        onClick={() => {
                          // Simulate successful click coordination
                          triggerHaptic('correct');
                          setCorrectHits((prev) => prev + 1);
                          setTotalAttempts((prev) => prev + 1);
                          setSpeeds((prev) => [...prev, performance.now() - roundStartTimeRef.current]);
                          setupNextRound(round + 1);
                        }}
                        className="w-full py-2 bg-brand-purple text-white font-bold text-[10px] uppercase font-display rounded-lg"
                      >
                        Simulate Click L3 + Push LS Up
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          triggerHaptic('correct');
                          setCorrectHits((prev) => prev + 1);
                          setTotalAttempts((prev) => prev + 1);
                          setSpeeds((prev) => [...prev, performance.now() - roundStartTimeRef.current]);
                          setupNextRound(round + 1);
                        }}
                        className="w-full py-2 bg-brand-purple text-white font-bold text-[10px] uppercase font-display rounded-lg"
                      >
                        Simulate Click R3 + Pull RS Down
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-[10px] text-zinc-500 leading-normal flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
              <span>
                {activeMode === 'coordination' ? 'Push the joystick all the way in the required direction AND click it down at the same time.' : 'Click the analog thumbsticks straight down until they click.'}
              </span>
            </div>
          </div>

          {/* Interactive Controller */}
          <div className="lg:col-span-7 flex flex-col justify-center py-6 min-h-[300px]">
            <ControllerView
              hidePanel={true}
              highlightedButton={prompt === 'L3' || prompt === 'L3+LS_UP' ? 'L3' : 'R3'}
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
