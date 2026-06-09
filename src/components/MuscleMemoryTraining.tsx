import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { Brain, Volume2, EyeOff, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';

type MemoryMode = 'blind' | 'audio' | 'challenge';

interface SessionResult {
  date: string;
  mode: MemoryMode;
  accuracy: number;
  peakSequence: number; // For memory challenge
  score: number;
  dateString: string;
}

export const MuscleMemoryTraining: React.FC = () => {
  const { logDrillSession, triggerHaptic, stats } = useApp();

  // Game configuration states
  const [activeMode, setActiveMode] = useState<MemoryMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const maxRounds = 10; // For Blind & Audio mode

  // Metrics trackers
  const [prompt, setPrompt] = useState<ButtonKey>('A');
  const [correctHits, setCorrectHits] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  // Simon Says Memory Challenge states
  const [sequence, setSequence] = useState<ButtonKey[]>([]);
  const [userSequenceIndex, setUserSequenceIndex] = useState(0);
  const [sequencePlaying, setSequencePlaying] = useState(false);
  const [peakSequenceLength, setPeakSequenceLength] = useState(0);
  const [lives, setLives] = useState(3);
  const [activePlaybackHighlight, setActivePlaybackHighlight] = useState<ButtonKey | null>(null);

  // Speech helper
  const speechRate = 1.35;
  const speechPitch = 0.95;

  // History records
  const [historyLogs, setHistoryLogs] = useState<SessionResult[]>([]);
  const [mistakeHistory, setMistakeHistory] = useState<Record<string, number>>({});
  const roundStartTimeRef = useRef(0);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_memory_history');
    if (saved) {
      try {
        setHistoryLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse memory history logs', e);
      }
    }
  }, []);

  const saveResult = (result: SessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_memory_history', JSON.stringify(nextLogs));
  };

  // Convert key to natural vocal phrase
  const getSpeakingPhrase = (key: ButtonKey): string => {
    switch (key) {
      case 'LB': return 'Left Bumper';
      case 'RB': return 'Right Bumper';
      case 'LT': return 'Left Trigger';
      case 'RT': return 'Right Trigger';
      case 'DpadUp': return 'D-Pad Up';
      case 'DpadDown': return 'D-Pad Down';
      case 'DpadLeft': return 'D-Pad Left';
      case 'DpadRight': return 'D-Pad Right';
      case 'LeftStick': return 'Left Stick Center';
      case 'RightStick': return 'Right Stick Center';
      case 'L3': return 'Left Stick Click';
      case 'R3': return 'Right Stick Click';
      default: return key;
    }
  };

  // Speaks prompt utilizing Web Speech API
  const speakPrompt = (key: ButtonKey) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speaking
      const phrase = getSpeakingPhrase(key);
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getNextPrompt = (current?: ButtonKey): ButtonKey => {
    const pool = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'] as ButtonKey[];
    const filtered = current ? pool.filter(b => b !== current) : pool;
    
    // Adaptive learning: prioritize buttons frequently missed
    const weights: Record<string, number> = {};
    let totalWeight = 0;
    
    filtered.forEach((btn) => {
      const mistakes = stats.buttonMistakes?.[btn] || 0;
      weights[btn] = 1 + mistakes;
      totalWeight += weights[btn];
    });
    
    let rand = Math.random() * totalWeight;
    for (const btn of filtered) {
      rand -= weights[btn];
      if (rand <= 0) {
        return btn;
      }
    }
    
    return filtered[Math.floor(Math.random() * filtered.length)];
  };

  // Initialize drills
  const startGame = (mode: MemoryMode) => {
    setActiveMode(mode);
    setGameState('countdown');
    setCountdown(3);
    setRound(1);
    setCorrectHits(0);
    setTotalAttempts(0);
    setSpeeds([]);
    setScore(0);
    setLives(mode === 'challenge' ? 3 : 0);
    setSequence([]);
    setUserSequenceIndex(0);
    setPeakSequenceLength(0);
    setMistakeHistory({});
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

  // Handle drill progression
  const setupNextRound = (roundNum: number) => {
    if (activeMode === 'challenge') {
      setupMemoryChallengeRound(roundNum);
      return;
    }

    // Blind & Audio Mode have 10 rounds
    if (roundNum > maxRounds) {
      handleGameOver();
      return;
    }

    setRound(roundNum);
    const nextBtn = getNextPrompt(prompt);
    setPrompt(nextBtn);

    if (activeMode === 'audio') {
      // Announce voice prompt
      speakPrompt(nextBtn);
    }

    roundStartTimeRef.current = performance.now();
  };

  // Simon Says sequence player
  const playSequence = async (seq: ButtonKey[]) => {
    setSequencePlaying(true);
    
    // Tiny delay before starting playback
    await new Promise(r => setTimeout(r, 600));

    for (let i = 0; i < seq.length; i++) {
      const btn = seq[i];
      setActivePlaybackHighlight(btn);
      triggerHaptic('correct');
      
      if (activeMode === 'challenge') {
        speakPrompt(btn);
      }

      await new Promise(r => setTimeout(r, 600)); // flash duration
      setActivePlaybackHighlight(null);
      await new Promise(r => setTimeout(r, 200)); // gap
    }

    setSequencePlaying(false);
    setUserSequenceIndex(0);
    roundStartTimeRef.current = performance.now();
  };

  const setupMemoryChallengeRound = (waveNum: number) => {
    setRound(waveNum);
    
    // Add a new random button to the existing sequence
    setSequence((prev) => {
      const nextSeq = [...prev, getNextPrompt(prev[prev.length - 1])];
      if (nextSeq.length > peakSequenceLength) {
        setPeakSequenceLength(nextSeq.length);
      }
      playSequence(nextSeq);
      return nextSeq;
    });
  };

  // Evaluate user inputs
  const handleInput = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing' || sequencePlaying) return;

    const reactionTime = Math.round(performance.now() - roundStartTimeRef.current);

    if (activeMode === 'challenge') {
      // Memory Challenge evaluation
      const targetButton = sequence[userSequenceIndex];
      
      if (clickedButton === targetButton) {
        // Correct step in sequence!
        triggerHaptic('correct');
        
        if (userSequenceIndex === sequence.length - 1) {
          // Entire sequence successfully repeated!
          setCorrectHits(prev => prev + sequence.length);
          setTotalAttempts(prev => prev + sequence.length);
          
          // Award points
          const wavePoints = sequence.length * 150;
          setScore(prev => prev + wavePoints);

          // Trigger combo success rumble
          triggerHaptic('combo');

          // Progress to next wave sequence (adds 1 button)
          setTimeout(() => setupNextRound(round + 1), 800);
        } else {
          // Advance index
          setUserSequenceIndex(prev => prev + 1);
        }
      } else {
        // Failed sequence step!
        triggerHaptic('incorrect');
        setTotalAttempts(prev => prev + 1);
        setMistakeHistory(prev => ({ ...prev, [targetButton]: (prev[targetButton] || 0) + 1 }));

        setLives((prev) => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            handleGameOver();
            return 0;
          }
          // Re-play sequence to user
          playSequence(sequence);
          return nextLives;
        });
      }
      return;
    }

    // Blind & Audio mode evaluation
    const isCorrect = clickedButton === prompt;

    if (isCorrect) {
      triggerHaptic('correct');
      setCorrectHits(prev => prev + 1);
      setTotalAttempts(prev => prev + 1);
      setSpeeds(prev => [...prev, reactionTime]);
      setupNextRound(round + 1);
    } else {
      triggerHaptic('incorrect');
      setTotalAttempts(prev => prev + 1);
      setMistakeHistory(prev => ({ ...prev, [prompt]: (prev[prompt] || 0) + 1 }));
      // In blind and audio, a failure registers and advances immediately to maintain pace
      setupNextRound(round + 1);
    }
  };

  // Game completed
  const handleGameOver = () => {
    setGameState('completed');
    
    // Stop any ongoing voice prompts
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0;
    const avgResponse = speeds.length > 0 ? Math.round(speeds.reduce((a,b)=>a+b,0)/speeds.length) : 0;

    // Calculate final scores
    let finalScore = score;
    if (activeMode !== 'challenge') {
      // Score = correct hits * speed coefficient
      const speedFactor = avgResponse > 0 ? Math.max(1, Math.round(1500 / avgResponse)) : 1;
      finalScore = correctHits * 100 * speedFactor;
    }

    const result: SessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      mode: activeMode!,
      accuracy,
      peakSequence: activeMode === 'challenge' ? peakSequenceLength : 0,
      score: finalScore,
      dateString: new Date().toLocaleDateString()
    };

    saveResult(result);

    // Sync XP rewards
    let drillId = 'micro_adjustments';
    if (activeMode === 'blind') drillId = 'strafe_aim';
    else if (activeMode === 'challenge') drillId = 'slide_cancel';

    logDrillSession(drillId, {
      accuracy,
      reactionTime: avgResponse > 0 ? avgResponse : undefined,
      buttonMistakes: mistakeHistory
    });
  };

  const getModeLabel = (mode: MemoryMode) => {
    switch (mode) {
      case 'blind': return 'Blind Silhouette Mode';
      case 'audio': return 'Audio Command Mode';
      case 'challenge': return 'Simon Memory Challenge';
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Header intro */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                <Brain className="h-5 w-5 animate-pulse" />
              </span>
              Phase 3: Muscle Memory Builder
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Break the visual link. These routines train you to stop looking down at your gamepad. By hiding layout icons or converting inputs to vocal speech commands, you lock layout coordinate maps entirely into mechanical memory.
            </p>
          </section>

          {/* Drill cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Blind Mode Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 h-60 hover:border-brand-cyan/40 hover:shadow-xl transition-all duration-300">
              <div className="space-y-2">
                <div className="p-3 w-12 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                  <EyeOff className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Blind Silhouette
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Hides button indicators. The controller is a blank dark silhouette. Input prompts from spatial coordinate maps.
                </p>
              </div>
              <button
                onClick={() => startGame('blind')}
                className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 text-zinc-300 hover:text-brand-cyan text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Blind Lab
              </button>
            </div>

            {/* Audio Mode Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 h-60 hover:border-brand-purple/40 hover:shadow-xl transition-all duration-300">
              <div className="space-y-2">
                <div className="p-3 w-12 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                  <Volume2 className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Audio vocal Command
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  The system vocalizes commands via speech synth: *"Press Right Trigger"*. Hides on-screen texts to enforce audio mapping.
                </p>
              </div>
              <button
                onClick={() => startGame('audio')}
                className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-purple/50 hover:bg-brand-purple/5 text-zinc-300 hover:text-brand-purple text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Vocal Drill
              </button>
            </div>

            {/* Simon Challenge Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 h-60 hover:border-brand-magenta/40 hover:shadow-xl transition-all duration-300">
              <div className="space-y-2">
                <div className="p-3 w-12 rounded-xl bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/20">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Memory Sequence
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Simon Says memory drill. Replicate a growing sequence of flashes and voice signals. Mistakes cost lives.
                </p>
              </div>
              <button
                onClick={() => startGame('challenge')}
                className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-magenta/50 hover:bg-brand-magenta/5 text-zinc-300 hover:text-brand-magenta text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Launch Memory Test
              </button>
            </div>

          </div>

          {/* History logs */}
          {historyLogs.length > 0 && (
            <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                Muscle Memory Logs (Phase 3)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-bold tracking-wider">
                      <th className="py-2.5">Date</th>
                      <th>Drill Type</th>
                      <th>Accuracy</th>
                      <th>Max Sequence</th>
                      <th>Final Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                    {historyLogs.map((log, index) => (
                      <tr key={index}>
                        <td className="py-3 text-zinc-500">{log.date}</td>
                        <td className="font-bold text-white uppercase font-display text-[10px] tracking-wide">{getModeLabel(log.mode)}</td>
                        <td className={log.accuracy >= 90 ? 'text-brand-green' : 'text-zinc-300'}>{log.accuracy}%</td>
                        <td className="font-mono">{log.peakSequence > 0 ? `${log.peakSequence} keys` : 'N/A'}</td>
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

      {/* Game Countdown */}
      {gameState === 'countdown' && (
        <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <span className="text-xs font-semibold text-brand-purple uppercase tracking-widest font-display animate-pulse">
            De-activating Visual Helpers...
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-purple flex items-center justify-center text-white text-5xl font-black font-display animate-spin shadow-2xl shadow-brand-purple/5">
            <span className="animate-pulse">{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            {activeMode === 'blind' && 'Silhouette mode active. Gamepad outlines hidden.'}
            {activeMode === 'audio' && 'Vocal commands active. Audio mapping check.'}
            {activeMode === 'challenge' && 'Sequence buffer active. Focus on sequence orders.'}
          </p>
        </div>
      )}

      {/* Game playing */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Visual Board */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[500px]">
            
            {/* Header HUD */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">
                  Active Mode: <span className="text-white">{getModeLabel(activeMode!)}</span>
                </span>

                {/* Hearts for challenge */}
                {activeMode === 'challenge' && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((h) => (
                      <div
                        key={h}
                        className={`h-3 w-3 rounded-full ${
                          h <= lives ? 'bg-brand-magenta shadow-[0_0_6px_#ff007f]' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex gap-4 text-[10px] font-bold font-display uppercase tracking-wider items-center">
                {activeMode === 'challenge' ? (
                  <>
                    <span className="text-brand-purple">Sequence Wave: {round}</span>
                    <span className="text-zinc-300">Peak Size: {peakSequenceLength}</span>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-400">Round {round} / {maxRounds}</span>
                    <span className="text-brand-green">Accuracy: {totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100}%</span>
                  </>
                )}
              </div>
            </div>

            {/* Instruction prompts display */}
            <div className="text-center py-4 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-1 relative">
              {activeMode === 'blind' && (
                <>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">BLIND STRIKE</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-cyan uppercase tracking-wider font-display animate-pulse">
                    PRESS {getSpeakingPhrase(prompt).toUpperCase()}
                  </span>
                </>
              )}

              {activeMode === 'audio' && (
                <>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">VOCAL COMMAND SIGNAL</span>
                  <span className="text-sm font-bold text-brand-purple uppercase tracking-wide font-display flex items-center justify-center gap-1.5 animate-pulse">
                    <Volume2 className="h-4.5 w-4.5 text-brand-purple" />
                    LISTEN TO VOICE INSTRUCTIONS
                  </span>
                </>
              )}

              {activeMode === 'challenge' && (
                <>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">SEQUENCE LAB</span>
                  {sequencePlaying ? (
                    <span className="text-sm font-bold text-brand-magenta uppercase tracking-wide font-display animate-pulse">
                      Memorizing playback sequence... ({userSequenceIndex + 1}/{sequence.length})
                    </span>
                  ) : (
                    <span className="text-base font-black text-brand-cyan uppercase tracking-wider font-display">
                      REPLAY SEQUENCE: STEP {userSequenceIndex + 1} OF {sequence.length}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Visual controller area - Blank silhouette for Blind Mode */}
            <div className="flex-1 flex items-center justify-center py-6 min-h-[300px]">
              <div className={activeMode === 'blind' ? 'opacity-[0.03] pointer-events-none' : ''}>
                <ControllerView
                  hidePanel={true}
                  highlightedButton={activePlaybackHighlight}
                  onButtonClick={handleInput}
                  className="max-w-[400px]"
                />
              </div>
              
              {activeMode === 'blind' && (
                <div className="absolute flex flex-col items-center justify-center space-y-2 pointer-events-none select-none text-center">
                  <EyeOff className="h-12 w-12 text-zinc-800 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 font-display">
                    Visual Layout Disabled
                  </span>
                  <p className="text-[8px] text-zinc-700 max-w-xs leading-normal font-medium">
                    Gamepad image is hidden. Use your physical controller or click the approximate spatial positions on the blind board area.
                  </p>
                </div>
              )}
            </div>

            {/* Footer advice */}
            <div className="text-zinc-500 text-[9px] text-center border-t border-zinc-900/60 pt-3 uppercase font-bold tracking-widest">
              {activeMode === 'blind' && 'Coordinates click zones map to standard layout bounds.'}
              {activeMode === 'audio' && 'Speech synthethizer delivers prompts.'}
              {activeMode === 'challenge' && 'Replicate exact order of highlights.'}
            </div>

          </div>

          {/* Telemetry sidebar (Right/4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live stats */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Diagnostics Lab (Phase 3)
                </h3>
              </div>

              <div className="space-y-5 flex-1">
                {/* Accuracy */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Hit Ratio</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Successes</span>
                    <span className="text-xs font-black text-white font-display uppercase">{correctHits} / {totalAttempts}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Points System</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Score Accumulation</span>
                    <span className="text-xs font-black text-brand-purple font-mono uppercase">{score} PTS</span>
                  </div>
                </div>

                {/* Speed metrics */}
                {activeMode !== 'challenge' && (
                  <div className="space-y-2">
                    <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Reflex Speed History</span>
                    <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1 font-mono text-[10px] max-h-36 overflow-y-auto">
                      {speeds.length === 0 ? (
                        <span className="text-zinc-600 block text-center py-2 uppercase font-sans font-bold text-[8px]">Awaiting Signal Taps</span>
                      ) : (
                        speeds.slice(-3).reverse().map((s, idx) => (
                          <div key={idx} className="flex justify-between py-0.5 border-b border-zinc-900/40">
                            <span className="text-zinc-500">RND {speeds.length - idx}</span>
                            <span className="text-brand-magenta font-bold">{s} ms</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal">
                  <strong>Auditory Tip:</strong> Adjust browser audio volumes. Vocal cues announce commands immediately upon round transitions.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Completed results */}
      {gameState === 'completed' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 max-w-2xl mx-auto space-y-6">
          
          <div className="text-center space-y-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan flex items-center justify-center shadow-lg shadow-brand-cyan/5 animate-pulse">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black font-display text-white uppercase tracking-wider">
              Muscle Memory Analysis Completed
            </h2>
            <p className="text-xs text-zinc-500">Mechanical coordinates logged in operative profile databases.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Score */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Final Score</span>
              <span className="text-xl font-black font-display text-brand-cyan text-glow-cyan font-mono">
                {activeMode === 'challenge' ? score : correctHits * 100}
              </span>
              <span className="block text-[8px] text-zinc-500">points accumulated</span>
            </div>

            {/* Accuracy */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Hits Ratio</span>
              <span className={`text-xl font-black font-display ${
                (correctHits / (totalAttempts || 1)) >= 0.9 ? 'text-brand-green' : 'text-white'
              }`}>
                {totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0}%
              </span>
              <span className="block text-[8px] text-zinc-500">({correctHits}/{totalAttempts} hits)</span>
            </div>

            {/* Peak Sequence (for challenge) or Speed */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              {activeMode === 'challenge' ? (
                <>
                  <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Peak Sequence</span>
                  <span className="text-xl font-black font-display text-brand-purple text-glow-purple font-mono">
                    {peakSequenceLength} keys
                  </span>
                  <span className="block text-[8px] text-zinc-500">repeated correctly</span>
                </>
              ) : (
                <>
                  <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Average Response</span>
                  <span className="text-xl font-black font-display text-brand-purple text-glow-purple font-mono">
                    {speeds.length > 0 ? Math.round(speeds.reduce((a,b)=>a+b,0)/speeds.length) : 0}ms
                  </span>
                  <span className="block text-[8px] text-zinc-500">response speed</span>
                </>
              )}
            </div>

          </div>

          {/* XP Secures summary */}
          <div className="p-4 bg-brand-purple/5 border border-brand-purple/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-purple/15 text-brand-purple">
                <Brain className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">Score parameters synced to active callsign profile.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-purple uppercase tracking-wider font-display">
              +150 XP SECURED
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
