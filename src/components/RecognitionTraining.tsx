import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { Target, Clock, AlertTriangle, ChevronRight, CheckCircle2, RotateCcw, Award, Gamepad2 } from 'lucide-react';

type GameMode = 'flashcards' | 'namethebutton' | 'timed';

interface SessionResult {
  date: string;
  mode: GameMode;
  accuracy: number;
  avgResponseTime: number; // in ms
  mistakesCount: number;
  mostMistaken: string[];
}

const BUTTON_POOL: ButtonKey[] = [
  'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT',
  'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight',
  'LeftStick', 'RightStick', 'L3', 'R3', 'Start', 'Back'
];

export const RecognitionTraining: React.FC = () => {
  const { triggerHaptic, logDrillSession, stats } = useApp();
  
  // Game states
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const maxRounds = 10;

  // Telemetry trackers
  const [prompt, setPrompt] = useState<ButtonKey>('A');
  const [options, setOptions] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [mistakeHistory, setMistakeHistory] = useState<Record<string, number>>({});
  const [currentPromptStartTime, setCurrentPromptStartTime] = useState(0);
  
  // Saved logs
  const [historyLogs, setHistoryLogs] = useState<SessionResult[]>([]);

  // Load local history on mount
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_recognition_history');
    if (saved) {
      try {
        setHistoryLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recognition history', e);
      }
    }
  }, []);

  const saveResult = (result: SessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)]; // Keep last 20
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_recognition_history', JSON.stringify(nextLogs));
  };

  // Generate a random button excluding the current one
  const getRandomButton = (current?: ButtonKey): ButtonKey => {
    const pool = current ? BUTTON_POOL.filter(b => b !== current) : BUTTON_POOL;
    
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

  // Initialize a round
  const startNextRound = (nextRoundNum: number) => {
    if (nextRoundNum > maxRounds) {
      handleGameComplete();
      return;
    }

    setRound(nextRoundNum);
    const nextButton = getRandomButton(prompt);
    setPrompt(nextButton);

    // Setup options for "Name The Button" multiple choice
    if (activeMode === 'namethebutton') {
      const distractors: string[] = [];
      while (distractors.length < 3) {
        const d = getRandomButton(nextButton);
        if (!distractors.includes(d) && d !== nextButton) {
          distractors.push(d);
        }
      }
      // Shuffle options
      const allOptions = [nextButton, ...distractors].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
    }

    setCurrentPromptStartTime(performance.now());
  };

  // Start the game loop
  const startGame = (mode: GameMode) => {
    setActiveMode(mode);
    setGameState('countdown');
    setCountdown(3);
    setRound(1);
    setCorrectCount(0);
    setSpeeds([]);
    setMistakeHistory({});
  };

  // Countdown timer effect
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        startNextRound(1);
      }
    }
    return () => clearTimeout(timerId);
  }, [gameState, countdown]);

  // Handle user inputs (gamepad or SVG click)
  const handleInput = (buttonClicked: ButtonKey) => {
    if (gameState !== 'playing') return;

    const endTime = performance.now();
    const timeSpent = Math.round(endTime - currentPromptStartTime);

    // Evaluate A/B/X/Y Dpad left stick L3 start back etc.
    let isCorrect = false;
    
    if (activeMode === 'flashcards' || activeMode === 'timed') {
      isCorrect = buttonClicked === prompt;
    }

    if (isCorrect) {
      triggerHaptic('correct');
      setCorrectCount(prev => prev + 1);
      setSpeeds(prev => [...prev, timeSpent]);
      startNextRound(round + 1);
    } else {
      triggerHaptic('incorrect');
      // Log mistake
      setMistakeHistory(prev => ({
        ...prev,
        [prompt]: (prev[prompt] || 0) + 1
      }));
      // In flashcards/timed, we register the mistake but force them to find the correct button to advance,
      // which trains correct muscle memory! But we only record speeds for correct taps.
      // If it was timed, we can move next to maintain speed flow
      if (activeMode === 'timed') {
        startNextRound(round + 1);
      }
    }
  };

  // Handle multiple-choice click for "Name The Button"
  const handleOptionSelect = (selectedName: string) => {
    if (gameState !== 'playing') return;

    const endTime = performance.now();
    const timeSpent = Math.round(endTime - currentPromptStartTime);

    const isCorrect = selectedName === prompt;

    if (isCorrect) {
      triggerHaptic('correct');
      setCorrectCount(prev => prev + 1);
      setSpeeds(prev => [...prev, timeSpent]);
    } else {
      triggerHaptic('incorrect');
      setMistakeHistory(prev => ({
        ...prev,
        [prompt]: (prev[prompt] || 0) + 1
      }));
    }

    startNextRound(round + 1);
  };

  // Finish session, compute averages, save log, claim XP
  const handleGameComplete = () => {
    setGameState('completed');

    const accuracy = Math.round((correctCount / maxRounds) * 100);
    const avgResponseTime = speeds.length > 0 
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
      : 0;

    // Identify top mistakes
    const sortedMistakes = Object.keys(mistakeHistory).sort(
      (a, b) => mistakeHistory[b] - mistakeHistory[a]
    );

    const result: SessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      mode: activeMode!,
      accuracy,
      avgResponseTime,
      mistakesCount: Object.values(mistakeHistory).reduce((a, b) => a + b, 0),
      mostMistaken: sortedMistakes.slice(0, 3)
    };

    saveResult(result);

    // Sync stats directly to user profile XP systems!
    // Trigger drill session log to award XP
    let drillId = 'target_snap';
    if (activeMode === 'timed') drillId = 'reaction_snap';
    else if (activeMode === 'flashcards') drillId = 'micro_adjustments';
    
    logDrillSession(drillId, {
      accuracy,
      reactionTime: avgResponseTime > 0 ? avgResponseTime : undefined,
      buttonMistakes: mistakeHistory
    });
  };

  const getModeLabel = (mode: GameMode) => {
    switch (mode) {
      case 'flashcards': return 'Button Flashcards';
      case 'namethebutton': return 'Name The Button';
      case 'timed': return 'Timed Recognition';
    }
  };

  const getButtonDisplayLabel = (key: ButtonKey): string => {
    switch (key) {
      case 'DpadUp': return 'D-Pad UP';
      case 'DpadDown': return 'D-Pad DOWN';
      case 'DpadLeft': return 'D-Pad LEFT';
      case 'DpadRight': return 'D-Pad RIGHT';
      case 'LeftStick': return 'Left Stick (Center)';
      case 'RightStick': return 'Right Stick (Center)';
      case 'L3': return 'L3 Stick Click';
      case 'R3': return 'R3 Stick Click';
      default: return key;
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Landing Intro */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                <Target className="h-5 w-5" />
              </span>
              Phase 1: Recognition Protocols
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Establish foundational muscle memory vectors. Recognition drills speed up button search triggers, eliminating layout errors (like confusing bumper bars or stick depressions) under intense competitive shootouts.
            </p>
          </section>

          {/* Drills selection grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Mode 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 h-60 hover:border-brand-cyan/30 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="p-3 w-12 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/25">
                  <Gamepad2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Button Flashcards
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  The dashboard displays a callsing: "Where is RT?". Click the corresponding element on the controller. Mismatches log faults.
                </p>
              </div>
              <button
                onClick={() => startGame('flashcards')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-cyan/40 hover:bg-brand-cyan/5 text-zinc-300 hover:text-brand-cyan text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Flashcards
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Mode 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 h-60 hover:border-brand-purple/30 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="p-3 w-12 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/25">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Name The Button
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  A specific button flashes in amber. Select the correct button label name from 4 multiple choice options.
                </p>
              </div>
              <button
                onClick={() => startGame('namethebutton')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-purple/40 hover:bg-brand-purple/5 text-zinc-300 hover:text-brand-purple text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Identification
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Mode 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 h-60 hover:border-brand-magenta/30 transition-all duration-300 group">
              <div className="space-y-2">
                <div className="p-3 w-12 rounded-xl bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/25">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Timed Recognition
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Reaction speed test. A button flashes: "PRESS Y NOW!". Hit the button as fast as humanly possible. Computes response curve in ms.
                </p>
              </div>
              <button
                onClick={() => startGame('timed')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-magenta/40 hover:bg-brand-magenta/5 text-zinc-300 hover:text-brand-magenta text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Speed Test
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* History logs table */}
          {historyLogs.length > 0 && (
            <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                Operative Session History (Phase 1)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-bold tracking-wider">
                      <th className="py-2.5">Date</th>
                      <th>Drill Protocol</th>
                      <th>Accuracy</th>
                      <th>Avg Speed</th>
                      <th>Mistake Zones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                    {historyLogs.map((log, index) => (
                      <tr key={index}>
                        <td className="py-3 text-zinc-500">{log.date}</td>
                        <td className="font-bold text-white uppercase font-display text-[10px] tracking-wide">{getModeLabel(log.mode)}</td>
                        <td className={log.accuracy >= 90 ? 'text-brand-green' : 'text-zinc-300'}>{log.accuracy}%</td>
                        <td className="font-mono">{log.avgResponseTime}ms</td>
                        <td>
                          {log.mostMistaken.length === 0 ? (
                            <span className="text-[10px] text-zinc-600 font-bold uppercase">Perfect Session</span>
                          ) : (
                            <span className="text-[10px] text-red-400 uppercase font-mono">{log.mostMistaken.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      )}

      {/* Game Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <span className="text-xs font-semibold text-brand-purple uppercase tracking-widest font-display animate-pulse">
            Pre-flight Diagnostic Lock-in
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-cyan flex items-center justify-center text-white text-5xl font-black font-display animate-spin-slow shadow-2xl shadow-brand-cyan/5">
            <span className="animate-pulse transform rotate-0" style={{ animationDirection: 'reverse' }}>{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Calibrate your thumbs. Intercepting telemetry stream.
          </p>
        </div>
      )}

      {/* Game Active Screen */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main game board (Left/8 Columns) */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[480px]">
            
            {/* HUD Header info */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">
                Active Protocol: <span className="text-white">{getModeLabel(activeMode!)}</span>
              </span>
              <div className="flex gap-4 text-[10px] font-bold font-display uppercase tracking-wider">
                <span className="text-zinc-400">Round {round} / {maxRounds}</span>
                <span className="text-brand-green">Acc: {round > 1 ? Math.round((correctCount / (round - 1)) * 100) : 100}%</span>
              </div>
            </div>

            {/* Prompt Instruction display */}
            <div className="text-center py-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1">
              
              {activeMode === 'flashcards' && (
                <>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">LOCATE THE ELEMENT</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-cyan uppercase tracking-wider font-display animate-pulse">
                    WHERE IS {getButtonDisplayLabel(prompt)}?
                  </span>
                </>
              )}

              {activeMode === 'namethebutton' && (
                <>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">IDENTIFICATION LOCK-ON</span>
                  <span className="text-sm font-bold text-brand-purple uppercase tracking-wide font-display">
                    Identify the flashing amber button on the controller layout
                  </span>
                </>
              )}

              {activeMode === 'timed' && (
                <>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">REACTION TARGET</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-magenta uppercase tracking-wider font-display animate-pulse">
                    TAP {getButtonDisplayLabel(prompt)} NOW!
                  </span>
                  {speeds.length > 0 && (
                    <div className="text-xs font-mono font-bold text-brand-green mt-1.5 uppercase tracking-wider animate-bounce">
                      Reaction Time: {speeds[speeds.length - 1]} ms
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Controller visual viewport */}
            <div className="flex-1 flex items-center justify-center py-6 min-h-[300px]">
              <ControllerView
                hidePanel={true}
                highlightedButton={activeMode === 'namethebutton' ? prompt : null}
                onButtonClick={handleInput}
                className="max-w-[420px]"
              />
            </div>

            {/* Multiple choice options for Name The Button */}
            {activeMode === 'namethebutton' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-900">
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleOptionSelect(opt)}
                    className="py-3 px-2 text-center border border-zinc-800 hover:border-brand-purple bg-zinc-900/40 hover:bg-brand-purple/5 text-xs font-bold font-display uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    {getButtonDisplayLabel(opt as ButtonKey)}
                  </button>
                ))}
              </div>
            )}
            
            {/* Status footer instruction */}
            <div className="text-zinc-500 text-[9px] text-center border-t border-zinc-900/60 pt-3 uppercase font-bold tracking-widest">
              {activeMode === 'namethebutton' ? 'Select matching label below' : 'Click layout node directly or press on physical controller'}
            </div>

          </div>

          {/* Telemetry sidebar (Right/4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live Metrics */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between space-y-4">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Drill State Telemetry
                </h3>
              </div>

              <div className="space-y-4 flex-1">
                {/* Accuracy */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Precision Factor</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Taps Registered</span>
                    <span className="text-xs font-black text-white font-display uppercase">{correctCount} / {round - 1}</span>
                  </div>
                </div>

                {/* Reaction speed history graph or values */}
                <div className="space-y-2">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Reaction Speeds Logged</span>
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1 font-mono text-[10px] max-h-36 overflow-y-auto">
                    {speeds.length === 0 ? (
                      <span className="text-zinc-600 block text-center py-2 uppercase font-sans font-bold text-[8px]">No records yet</span>
                    ) : (
                      speeds.slice(-4).reverse().map((s, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-zinc-900/40">
                          <span className="text-zinc-500">RND {speeds.length - idx}</span>
                          <span className="text-brand-magenta font-semibold">{s} ms</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Mistakes tracker list */}
                <div className="space-y-2">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Active Fault Hotspots</span>
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1 text-[10px]">
                    {Object.keys(mistakeHistory).length === 0 ? (
                      <span className="text-brand-green block text-center py-2 uppercase font-bold text-[8px]">0 System Faults</span>
                    ) : (
                      Object.keys(mistakeHistory).map((key) => (
                        <div key={key} className="flex justify-between py-0.5 border-b border-zinc-900/40 font-mono text-red-400">
                          <span>{getButtonDisplayLabel(key as ButtonKey)}</span>
                          <span className="font-bold">{mistakeHistory[key]}x confused</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal">
                  In timely modes, speed scores are evaluated. Take less than 250ms to secure Elite rank speeds.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Game Completed Results Screen */}
      {gameState === 'completed' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 max-w-2xl mx-auto space-y-6">
          
          <div className="text-center space-y-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center shadow-lg shadow-brand-green/5 animate-pulse">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black font-display text-white uppercase tracking-wider">
              Calibration Report Completed
            </h2>
            <p className="text-xs text-zinc-500">Drill results have been synchronized to database files.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Accuracy */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 font-display">Target Accuracy</span>
              <span className={`text-2xl font-black font-display ${
                Math.round((correctCount / maxRounds) * 100) >= 90 ? 'text-brand-green text-glow-green' : 'text-white'
              }`}>
                {Math.round((correctCount / maxRounds) * 100)}%
              </span>
              <span className="block text-[8px] text-zinc-400">({correctCount} of {maxRounds} correct taps)</span>
            </div>

            {/* Avg Speed */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 font-display">Average Response</span>
              <span className="text-2xl font-black font-display text-brand-magenta text-glow-purple font-mono">
                {speeds.length > 0 ? Math.round(speeds.reduce((a,b)=>a+b,0)/speeds.length) : 0}ms
              </span>
              <span className="block text-[8px] text-zinc-400">
                {speeds.length > 0 && Math.round(speeds.reduce((a,b)=>a+b,0)/speeds.length) < 220 ? 'Elite Reflex Speed' : 'Standard Response'}
              </span>
            </div>

          </div>

          {/* Mistake Hotspots */}
          <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl space-y-2 text-left">
            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 font-display flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-brand-purple" />
              Operative Muscle Memory Faults (Hotspots)
            </span>
            {Object.keys(mistakeHistory).length === 0 ? (
              <p className="text-[10px] text-brand-green font-semibold uppercase">0 Mistakes logged! Perfect mechanical alignment.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {Object.keys(mistakeHistory).map((key) => (
                  <div key={key} className="flex justify-between p-2 bg-zinc-950/40 rounded-lg text-red-400 border border-red-500/5">
                    <span>{getButtonDisplayLabel(key as ButtonKey)}</span>
                    <span className="font-bold">Confused {mistakeHistory[key]}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Claim rewards footer */}
          <div className="p-4 bg-brand-purple/5 border border-brand-purple/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-purple/15 text-brand-purple">
                <Award className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">XP and level parameters synced to active callsign profile.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-purple uppercase tracking-wider font-display">
              +100 XP SECURED
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
