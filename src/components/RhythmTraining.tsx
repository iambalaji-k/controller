import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { RotateCcw, Volume2, VolumeX, ShieldAlert, Award, Activity } from 'lucide-react';

type RhythmDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface RhythmSessionResult {
  date: string;
  difficulty: RhythmDifficulty;
  score: number;
  accuracy: number;
  maxCombo: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
}

interface RhythmNote {
  id: string;
  button: ButtonKey;
  targetTime: number; // performance.now() timestamp when it overlaps target zone
  hit: boolean;
  rating?: 'perfect' | 'great' | 'good' | 'miss';
}

interface FloatFeedback {
  id: string;
  text: string;
  colorClass: string;
}

// Button pool for spawn types
const EASY_BUTTONS: ButtonKey[] = ['A', 'B'];
const MEDIUM_BUTTONS: ButtonKey[] = ['A', 'B', 'X', 'Y'];
const HARD_BUTTONS: ButtonKey[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT'];
const EXPERT_BUTTONS: ButtonKey[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];

// Web Audio API drum/bleep synthesizer class
class RhythmSynth {
  ctx: AudioContext | null = null;
  nextNoteTime = 0.0;
  timerId: any = null;
  bpm = 120;
  onBeat: (beatCount: number, targetTime: number) => void;
  beatCount = 0;
  isMuted = false;

  constructor(onBeat: (beatCount: number, targetTime: number) => void) {
    this.onBeat = onBeat;
  }

  start(bpm: number) {
    this.bpm = bpm;
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    this.nextNoteTime = this.ctx.currentTime;
    this.beatCount = 0;
    this.scheduler();
  }

  stop() {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {
        console.error('Failed to close AudioContext', e);
      }
    }
  }

  setMute(val: boolean) {
    this.isMuted = val;
  }

  scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.schedulePlay(this.beatCount, this.nextNoteTime);
      this.advanceNote();
    }
    this.timerId = setTimeout(() => this.scheduler(), 25);
  }

  advanceNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.beatCount++;
  }

  schedulePlay(beat: number, time: number) {
    if (!this.isMuted && this.ctx) {
      // Synth Kick drum
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kickOsc.frequency.setValueAtTime(100, time);
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.25);
      kickGain.gain.setValueAtTime(0.35, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      kickOsc.start(time);
      kickOsc.stop(time + 0.28);

      // Metronome sync blip
      const metOsc = this.ctx.createOscillator();
      const metGain = this.ctx.createGain();
      metOsc.connect(metGain);
      metGain.connect(this.ctx.destination);
      
      const pitch = beat % 4 === 0 ? 580 : 380;
      metOsc.frequency.setValueAtTime(pitch, time);
      metGain.gain.setValueAtTime(0.06, time);
      metGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      
      metOsc.start(time);
      metOsc.stop(time + 0.1);
    }

    // Call spawning in React: target matches visual offset (1.5 seconds travel)
    const delay = (time - this.ctx!.currentTime) * 1000;
    setTimeout(() => {
      this.onBeat(beat, performance.now() + 1500);
    }, Math.max(0, delay));
  }
}

export const RhythmTraining: React.FC = () => {
  const { logDrillSession, triggerHaptic } = useApp();

  // Settings
  const [difficulty, setDifficulty] = useState<RhythmDifficulty>('medium');
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [isMuted, setIsMuted] = useState(false);

  // Rhythm track state
  const [notes, setNotes] = useState<RhythmNote[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  // Rating counters
  const [perfectHits, setPerfectHits] = useState(0);
  const [greatHits, setGreatHits] = useState(0);
  const [goodHits, setGoodHits] = useState(0);
  const [misses, setMisses] = useState(0);

  // Timing halo trigger
  const [haloFeedback, setHaloFeedback] = useState<'perfect' | 'great' | 'good' | 'miss' | null>(null);
  const [floatFeedbacks, setFloatFeedbacks] = useState<FloatFeedback[]>([]);

  // Sound Synth class ref
  const synthRef = useRef<RhythmSynth | null>(null);
  
  // Game session parameters
  const bpm = difficulty === 'easy' ? 90 : difficulty === 'medium' ? 115 : difficulty === 'hard' ? 135 : 155;
  const gameDurationBeats = 50; // song stops after 50 beats

  // Tracks requestAnimationFrame loop for scrolling note visuals and checking misses
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameIdRef = useRef<number | null>(null);
  const totalSpawnedRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Leaderboard logs
  const [historyLogs, setHistoryLogs] = useState<RhythmSessionResult[]>([]);

  // Load history logs
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_rhythm_history');
    if (saved) {
      try {
        setHistoryLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse rhythm logs', e);
      }
    }
  }, []);

  const saveResult = (result: RhythmSessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_rhythm_history', JSON.stringify(nextLogs));
  };

  const getAccuracy = () => {
    const totalRated = perfectHits + greatHits + goodHits + misses;
    if (totalRated === 0) return 100;
    const earned = perfectHits * 100 + greatHits * 70 + goodHits * 40;
    return Math.round(earned / totalRated);
  };

  const getRank = (acc: number, currentMisses: number): 'S' | 'A' | 'B' | 'C' | 'D' => {
    if (acc >= 95 && currentMisses === 0) return 'S';
    if (acc >= 90) return 'A';
    if (acc >= 80) return 'B';
    if (acc >= 70) return 'C';
    return 'D';
  };

  const getRankColorClass = (rank: 'S' | 'A' | 'B' | 'C' | 'D') => {
    switch (rank) {
      case 'S': return 'text-yellow-400 text-glow-cyan font-black animate-pulse';
      case 'A': return 'text-brand-green font-bold';
      case 'B': return 'text-brand-cyan font-semibold';
      case 'C': return 'text-brand-purple';
      default: return 'text-zinc-500';
    }
  };

  // Metronome beat callback
  const handleSynthBeat = (beatCount: number, targetTime: number) => {
    if (beatCount >= gameDurationBeats) {
      handleGameOver();
      return;
    }

    // Determine notes to spawn based on difficulty beats
    let shouldSpawn = true;
    if (difficulty === 'easy' && beatCount % 2 !== 0) shouldSpawn = false; // spawn every 2 beats

    if (shouldSpawn) {
      // Pick a button from pool
      const pool = difficulty === 'easy' ? EASY_BUTTONS :
                   difficulty === 'medium' ? MEDIUM_BUTTONS :
                   difficulty === 'hard' ? HARD_BUTTONS : EXPERT_BUTTONS;

      const randomBtn = pool[Math.floor(Math.random() * pool.length)];

      const newNote: RhythmNote = {
        id: Math.random().toString(36).substring(2, 9),
        button: randomBtn,
        targetTime,
        hit: false
      };

      setNotes((prev) => [...prev, newNote]);
      totalSpawnedRef.current += 1;
    }
  };

  // Main game tick loop
  const updateLoop = () => {
    const now = performance.now();
    setCurrentTime(now);

    setNotes((prevNotes) => {
      let changed = false;
      const nextNotes = prevNotes.map((note) => {
        // Any unhit note that passes the hit window (targetTime + 250ms) registers as a MISS
        if (!note.hit && !note.rating && now - note.targetTime > 250) {
          changed = true;
          setMisses((m) => m + 1);
          setCombo(0);
          setHaloFeedback('miss');
          addFloatFeedback('MISS', 'text-red-500 font-bold');
          triggerHaptic('incorrect');
          return { ...note, rating: 'miss' as const };
        }
        return note;
      });

      // Filter out notes that are finished (e.g. passed target by 500ms)
      const filtered = nextNotes.filter((note) => now - note.targetTime < 600);
      if (filtered.length !== prevNotes.length || changed) {
        return filtered;
      }
      return prevNotes;
    });

    if (isPlayingRef.current) {
      animFrameIdRef.current = requestAnimationFrame(updateLoop);
    }
  };

  const addFloatFeedback = (text: string, colorClass: string) => {
    const newFb = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      colorClass
    };
    setFloatFeedbacks((prev) => [...prev, newFb]);
    
    // Automatically clear floating feedbacks
    setTimeout(() => {
      setFloatFeedbacks((prev) => prev.filter((f) => f.id !== newFb.id));
    }, 800);
  };

  // Initialize drills
  const startRhythmGame = () => {
    setGameState('countdown');
    setCountdown(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectHits(0);
    setGreatHits(0);
    setGoodHits(0);
    setMisses(0);
    totalSpawnedRef.current = 0;
    setNotes([]);
    setFloatFeedbacks([]);
    setHaloFeedback(null);
  };

  // Countdown timer
  useEffect(() => {
    let intervalId: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        intervalId = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        isPlayingRef.current = true;

        // Initialize Synth Metronome
        synthRef.current = new RhythmSynth(handleSynthBeat);
        synthRef.current.setMute(isMuted);
        synthRef.current.start(bpm);

        // Start requestAnimationFrame update loops
        animFrameIdRef.current = requestAnimationFrame(updateLoop);
      }
    }
    return () => clearTimeout(intervalId);
  }, [gameState, countdown]);

  const handleInput = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing') return;

    const now = performance.now();

    // Find the closest unhit note of this button type
    const candidateNotes = notes.filter((n) => n.button === clickedButton && !n.hit && !n.rating);
    if (candidateNotes.length === 0) return;

    // Sort by absolute distance to targetTime
    candidateNotes.sort((a, b) => Math.abs(now - a.targetTime) - Math.abs(now - b.targetTime));
    const targetNote = candidateNotes[0];

    const delta = Math.abs(now - targetNote.targetTime);

    // Hit validation thresholds:
    // Perfect: <= 70ms
    // Great: <= 140ms
    // Good: <= 240ms
    if (delta <= 240) {
      let timing: 'perfect' | 'great' | 'good' = 'good';
      let addedPoints = 100;
      let label = 'GOOD';
      let col = 'text-orange-400';

      if (delta <= 70) {
        timing = 'perfect';
        addedPoints = 300;
        label = 'PERFECT!';
        col = 'text-brand-cyan text-glow-cyan font-black';
        setPerfectHits((p) => p + 1);
        triggerHaptic('correct');
      } else if (delta <= 140) {
        timing = 'great';
        addedPoints = 200;
        label = 'GREAT';
        col = 'text-brand-green font-bold';
        setGreatHits((g) => g + 1);
        triggerHaptic('correct');
      } else {
        setGoodHits((g) => g + 1);
        triggerHaptic('correct');
      }

      // Combo update
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);

      // Score multiplier based on combo
      const multiplier = Math.floor(nextCombo / 10) + 1; // 1x, 2x for every 10 combo
      setScore((s) => s + addedPoints * multiplier);
      setHaloFeedback(timing);
      addFloatFeedback(label, col);

      if (nextCombo % 10 === 0) {
        triggerHaptic('combo');
      }

      // Mark note as hit
      setNotes((prev) =>
        prev.map((n) => (n.id === targetNote.id ? { ...n, hit: true, rating: timing } : n))
      );
    }
  };

  const handleGameOver = () => {
    isPlayingRef.current = false;
    setGameState('completed');

    if (synthRef.current) {
      synthRef.current.stop();
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }

    const accuracy = getAccuracy();
    const currentMisses = misses + (totalSpawnedRef.current - (perfectHits + greatHits + goodHits + misses));
    const finalRank = getRank(accuracy, currentMisses);

    const result: RhythmSessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      difficulty,
      score,
      accuracy,
      maxCombo,
      rank: finalRank
    };

    saveResult(result);

    // Sync XP
    logDrillSession('reaction_snap', {
      accuracy,
      reactionTime: Math.max(50, 200 - maxCombo * 2)
    });
  };

  // Mute control sync
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (synthRef.current) {
      synthRef.current.setMute(next);
    }
  };

  // Cleanup synthesizer on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (synthRef.current) {
        synthRef.current.stop();
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Compute horizontal note offset
  // Target circle is at 12% width
  // travelDuration = 1500 ms. Note travels from 100% to 12% in 1500ms.
  // position = targetZone + (targetTime - currentTime) * speed
  const getNoteLeftPosition = (note: RhythmNote) => {
    const targetOffset = 12; // 12%
    const travelMs = 1500;
    const diff = note.targetTime - currentTime; // ms left to target
    
    // Calculate percentage: if diff <= 0, it passed target zone
    const percentTravel = (diff / travelMs) * (100 - targetOffset);
    return targetOffset + percentTravel;
  };

  const currentAcc = getAccuracy();
  const currentRank = getRank(currentAcc, misses);

  return (
    <div className="space-y-6 text-left">
      
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Header intro */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple animate-pulse">
                <Volume2 className="h-5 w-5" />
              </span>
              Phase 6: Rhythm Synchronization
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Calibrate reactions to rhythmic telemetry. Inspired by arcade hit circles, notes glide down the runway matching metronomic bleeps. Strike targets precisely in the timing zone to build S-Rank accuracy status.
            </p>
          </section>

          {/* Settings */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Track Configuration & Tempo</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['easy', 'medium', 'hard', 'expert'] as RhythmDifficulty[]).map((diff) => {
                const tempo = diff === 'easy' ? '90 BPM' : diff === 'medium' ? '115 BPM' : diff === 'hard' ? '135 BPM' : '155 BPM';
                return (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`p-3 rounded-xl border text-center flex flex-col justify-center items-center gap-1 transition-all duration-200 uppercase font-display cursor-pointer ${
                      difficulty === diff
                        ? 'border-brand-purple bg-brand-purple/10 text-brand-purple shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{diff}</span>
                    <span className="text-[8px] font-mono text-zinc-500">{tempo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Play card */}
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-purple/40 hover:shadow-xl hover:shadow-brand-purple/5 transition-all duration-300">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider border border-zinc-800 bg-zinc-900 px-2 py-1 rounded text-zinc-400 font-display">
                    50 Notes Sprint
                  </span>
                  <button
                    onClick={toggleMute}
                    className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all duration-150 cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4 text-brand-green" />}
                  </button>
                </div>
                <h3 className="text-sm font-extrabold uppercase font-display text-white tracking-wide pt-1">
                  Rhythmic Calibration Run
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Rhythm notes travel from right to left. Press corresponding gamepad or click icons precisely when they align inside the target zone. Builds rhythmic sync, timing consistency, and button identification speed.
                </p>
              </div>
              <button
                onClick={startRhythmGame}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-purple/50 hover:bg-brand-purple/5 text-zinc-300 hover:text-brand-purple text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Launch Sound Sync Track
              </button>
            </div>

            {/* Quick calibration tip */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                Calibration Standards
              </h3>
              <div className="space-y-2 font-mono text-[9px] text-zinc-400">
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span className="text-brand-cyan font-bold">PERFECT</span>
                  <span>±70 ms</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span className="text-brand-green font-bold">GREAT</span>
                  <span>±140 ms</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span className="text-orange-400 font-bold">GOOD</span>
                  <span>±240 ms</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-red-500 font-bold">MISS</span>
                  <span>&gt;240 ms</span>
                </div>
              </div>
              <div className="p-2 rounded bg-zinc-900/50 border border-zinc-800 text-[8px] text-zinc-500 leading-snug">
                <strong>Audio note:</strong> Ensure your system sound is unmuted. Sound metronomes bleep exactly when note nodes cross the calibration zone.
              </div>
            </div>

          </div>

          {/* History log widgets */}
          {historyLogs.length > 0 && (
            <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                Rhythm Sync History Logs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-bold tracking-wider">
                      <th className="py-2.5">Date</th>
                      <th>Track Tempo</th>
                      <th>Accuracy</th>
                      <th>Peak Combo</th>
                      <th>Final Score</th>
                      <th>Rank Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                    {historyLogs.map((log, index) => (
                      <tr key={index}>
                        <td className="py-3 text-zinc-500">{log.date}</td>
                        <td className="font-bold text-white uppercase font-display text-[10px] tracking-wide">{log.difficulty}</td>
                        <td className={log.accuracy >= 90 ? 'text-brand-green' : 'text-zinc-300'}>{log.accuracy}%</td>
                        <td className="font-mono">x{log.maxCombo}</td>
                        <td className="font-mono text-zinc-400">{log.score} PTS</td>
                        <td className={`font-display font-black text-xs ${getRankColorClass(log.rank)}`}>{log.rank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      )}

      {/* Countdown timer */}
      {gameState === 'countdown' && (
        <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <span className="text-xs font-semibold text-brand-purple uppercase tracking-widest font-display animate-pulse">
            Pre-scheduling Audio Threads...
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-purple flex items-center justify-center text-white text-5xl font-black font-display animate-spin shadow-2xl shadow-brand-purple/5">
            <span className="animate-pulse">{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Tempo: {bpm} BPM | Spawn difficulty: {difficulty.toUpperCase()}
          </p>
        </div>
      )}

      {/* Game Playing Screen */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Scrolling track zone (Left/8 Columns) */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[500px] overflow-hidden relative">
            
            {/* HUD Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4 z-10">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">
                Tempo Curve: <span className="text-white">{bpm} BPM</span>
              </span>

              <div className="flex gap-4 text-[10px] font-bold font-display uppercase tracking-wider items-center">
                <span className="text-brand-purple">Combo Streak: x{combo}</span>
                <span className="text-brand-cyan">Score: {score}</span>
              </div>
            </div>

            {/* Rhythm Track Runway */}
            <div className="relative h-28 w-full bg-zinc-950/70 border border-zinc-900 rounded-2xl flex items-center overflow-hidden my-4">
              
              {/* Runway grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px)] bg-[size:40px_100%] opacity-[0.15] pointer-events-none" />

              {/* Floating hit feedbacks */}
              <div className="absolute left-[12%] -top-1 translate-y-1/2 flex flex-col gap-0.5 pointer-events-none select-none z-20">
                {floatFeedbacks.map((f) => (
                  <span key={f.id} className={`text-xs uppercase font-display animate-bounce font-black block tracking-wider ${f.colorClass}`}>
                    {f.text}
                  </span>
                ))}
              </div>

              {/* Target Zone Circle indicator */}
              <div 
                className={`absolute left-[12%] -translate-x-1/2 h-14 w-14 rounded-full border-2 flex items-center justify-center transition-all duration-100 ${
                  haloFeedback === 'perfect' ? 'border-brand-cyan bg-brand-cyan/10 scale-110 shadow-[0_0_15px_#00f0ff]' :
                  haloFeedback === 'great' ? 'border-brand-green bg-brand-green/10 scale-105 shadow-[0_0_10px_#10b981]' :
                  haloFeedback === 'good' ? 'border-orange-400 bg-orange-400/10 scale-100' :
                  haloFeedback === 'miss' ? 'border-red-500 bg-red-500/10 animate-shake scale-95' :
                  'border-zinc-700 bg-zinc-900/30'
                }`}
              >
                <div className="h-6 w-6 rounded-full border border-dashed border-zinc-800" />
                <div className="absolute h-0.5 w-8 bg-zinc-800" />
                <div className="absolute h-8 w-0.5 bg-zinc-800" />
              </div>

              {/* Scrolling notes */}
              {notes.map((note) => {
                if (note.hit) return null; // hide hit notes

                const leftPos = getNoteLeftPosition(note);
                if (leftPos < 0) return null; // out of screen bounds

                let btnColorClass = 'bg-zinc-900 border-zinc-700 text-zinc-300';
                if (note.button === 'A') btnColorClass = 'bg-brand-green/20 border-brand-green text-brand-green';
                else if (note.button === 'B') btnColorClass = 'bg-red-500/20 border-red-500 text-red-400';
                else if (note.button === 'X') btnColorClass = 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan';
                else if (note.button === 'Y') btnColorClass = 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
                
                return (
                  <div
                    key={note.id}
                    className={`absolute -translate-x-1/2 h-12 w-12 rounded-full border-2 flex items-center justify-center font-black font-display text-xs transition-all duration-75 select-none ${btnColorClass}`}
                    style={{ left: `${leftPos}%` }}
                  >
                    {note.button}
                  </div>
                );
              })}
            </div>

            {/* Controller View for interaction feedback */}
            <div className="flex-1 flex items-center justify-center py-2 min-h-[240px] z-10">
              <ControllerView
                hidePanel={true}
                onButtonClick={handleInput}
                className="max-w-[340px]"
              />
            </div>

            <div className="text-zinc-500 text-[9px] text-center border-t border-zinc-900/60 pt-3 uppercase font-bold tracking-widest z-10">
              Strike prompts precisely as they enter the target calibration ring.
            </div>

          </div>

          {/* Metrics panel sidebar (Right/4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live statistics */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Sync Telemetry HUD
                </h3>
                <button
                  onClick={toggleMute}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-zinc-400 hover:text-white transition-all duration-150 cursor-pointer"
                >
                  {isMuted ? <VolumeX className="h-4.5 w-4.5 text-red-500" /> : <Volume2 className="h-4.5 w-4.5 text-brand-green" />}
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {/* Ranking grade panel */}
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center relative overflow-hidden flex flex-col items-center justify-center gap-1">
                  <div className="absolute inset-0 bg-brand-purple/2 blur-lg pointer-events-none" />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-display">Current Standing</span>
                  
                  <span className={`text-4xl font-black font-display block leading-none py-1.5 ${getRankColorClass(currentRank)}`}>
                    {currentRank}
                  </span>
                  
                  <span className="text-[8px] font-bold text-zinc-400 font-mono">ACCURACY: {currentAcc}%</span>
                </div>

                {/* Score meters details */}
                <div className="space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between border-b border-zinc-900 pb-1 text-brand-cyan font-bold">
                    <span>PERFECT</span>
                    <span>{perfectHits}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-1 text-brand-green">
                    <span>GREAT</span>
                    <span>{greatHits}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 pb-1 text-orange-400">
                    <span>GOOD</span>
                    <span>{goodHits}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>MISSES / LATE</span>
                    <span>{misses}</span>
                  </div>
                </div>

                {/* Peak Combo */}
                <div className="space-y-1">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Max Streak</span>
                  <div className="px-4 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between font-mono text-xs">
                    <span className="text-zinc-400">Streak Record</span>
                    <span className="text-brand-purple font-bold">x{maxCombo}</span>
                  </div>
                </div>

              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="h-4.5 w-4.5 text-brand-cyan flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal">
                  Metronomes match notes scroll speed. Complete the 50-note cycle to secure final ranking scores.
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
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple flex items-center justify-center shadow-lg shadow-brand-purple/5 animate-pulse">
              <Award className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black font-display text-white uppercase tracking-wider">
              Rhythm calibration completed
            </h2>
            <p className="text-xs text-zinc-500">Sync ratings and ranking logs updated.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-4 gap-3">
            
            {/* Grade Rank */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center flex flex-col justify-center items-center">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Rank Rank</span>
              <span className={`text-2xl font-black font-display block ${
                getRankColorClass(getRank(getAccuracy(), misses))
              }`}>
                {getRank(getAccuracy(), misses)}
              </span>
              <span className="block text-[8px] text-zinc-500">standing</span>
            </div>

            {/* Score */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Final Score</span>
              <span className="text-xl font-black font-display text-brand-cyan text-glow-cyan font-mono block">
                {score}
              </span>
              <span className="block text-[8px] text-zinc-500">secured pts</span>
            </div>

            {/* Accuracy */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Accuracy Ratio</span>
              <span className={`text-xl font-black font-display block ${
                getAccuracy() >= 90 ? 'text-brand-green' : 'text-white'
              }`}>
                {getAccuracy()}%
              </span>
              <span className="block text-[8px] text-zinc-500">precision rate</span>
            </div>

            {/* Max Combo */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Peak Combo</span>
              <span className="text-xl font-black font-display text-brand-purple text-glow-purple font-mono block">
                x{maxCombo}
              </span>
              <span className="block text-[8px] text-zinc-500">hits streak</span>
            </div>

          </div>

          {/* XP Rewards */}
          <div className="p-4 bg-brand-purple/5 border border-brand-purple/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-purple/15 text-brand-purple">
                <Activity className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">XP and performance ratings synced to operative file.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-purple uppercase tracking-wider font-display">
              +{Math.min(300, 50 + Math.round(score * 0.05) + maxCombo * 4)} XP SECURED
            </span>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={startRhythmGame}
              className="px-6 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run Protocol
            </button>
            <button
              onClick={() => {
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
