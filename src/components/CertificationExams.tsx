import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { 
  Trophy, Award, RotateCcw, AlertTriangle 
} from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  prompts: { action: string; button: ButtonKey }[];
  xpReward: number;
}

export const CertificationExams: React.FC = () => {
  const { profile, saveCertificationGrade, triggerHaptic } = useApp();

  const EXAMS: Exam[] = [
    {
      id: 'batman',
      name: 'Batman Arkham Combat',
      subtitle: 'Freeflow Parry & Strike Calibration',
      description: 'Calibrate instant counter snaps, dodges, and batclaw grapple cancels.',
      xpReward: 250,
      prompts: [
        { action: 'STRIKE / ATTACK', button: 'X' },
        { action: 'PARRY / COUNTER', button: 'Y' },
        { action: 'DODGE / EVADE', button: 'A' },
        { action: 'GRAPPLE / BATCLAW', button: 'RB' },
        { action: 'STRIKE / ATTACK', button: 'X' },
        { action: 'PARRY / COUNTER', button: 'Y' }
      ]
    },
    {
      id: 'elden_ring',
      name: 'Elden Ring Combat',
      subtitle: 'Boss Parry & Lock-on Coordination',
      description: 'Drill dodge-rolling boss chains and snap camera target locks under pressure.',
      xpReward: 300,
      prompts: [
        { action: 'DODGE ROLL', button: 'B' },
        { action: 'LIGHT ATTACK', button: 'RB' },
        { action: 'BLOCK SHIELD', button: 'LB' },
        { action: 'LOCK ON TARGET', button: 'R3' },
        { action: 'DODGE ROLL', button: 'B' },
        { action: 'LIGHT ATTACK', button: 'RB' }
      ]
    },
    {
      id: 'gta',
      name: 'GTA V Driving',
      subtitle: 'Drive-By & Weapon Swap Calibration',
      description: 'Alternate throttle triggers with weapon wheel selection bumpers.',
      xpReward: 250,
      prompts: [
        { action: 'ACCELERATE VEHICLE', button: 'RT' },
        { action: 'WEAPON WHEEL SWAP', button: 'LB' },
        { action: 'BRAKE / REVERSE', button: 'LT' },
        { action: 'HANDBRAKE DRIFT', button: 'A' },
        { action: 'ACCELERATE VEHICLE', button: 'RT' },
        { action: 'BRAKE / REVERSE', button: 'LT' }
      ]
    },
    {
      id: 'forza',
      name: 'Forza Horizon Drift',
      subtitle: 'Traction Brake & Steering Drift',
      description: 'Drill handbrake slides, steering vectors, and ABS analog throttle pumps.',
      xpReward: 250,
      prompts: [
        { action: 'FULL THROTTLE ACCELERATE', button: 'RT' },
        { action: 'TRACTION BRAKE', button: 'LT' },
        { action: 'HANDBRAKE DRIFT', button: 'A' },
        { action: 'FULL THROTTLE ACCELERATE', button: 'RT' },
        { action: 'TRACTION BRAKE', button: 'LT' },
        { action: 'HANDBRAKE DRIFT', button: 'A' }
      ]
    }
  ];

  // Game/Exam state
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [promptIndex, setPromptIndex] = useState(0);
  
  // Scoring
  const [correctHits, setCorrectHits] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  
  const promptStartTimeRef = useRef<number>(0);

  // Countdown timer
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
        promptStartTimeRef.current = performance.now();
      }
    }
    return () => clearTimeout(t);
  }, [gameState, countdown]);

  const handleGamepadPress = (clickedButton: ButtonKey) => {
    if (gameState !== 'playing' || !selectedExam) return;

    const target = selectedExam.prompts[promptIndex];
    const timeSpent = performance.now() - promptStartTimeRef.current;

    const isCorrect = clickedButton === target.button;

    if (isCorrect) {
      triggerHaptic('correct');
      setCorrectHits(prev => prev + 1);
      setReactionTimes(prev => [...prev, timeSpent]);
    } else {
      triggerHaptic('incorrect');
    }

    const nextIdx = promptIndex + 1;
    if (nextIdx >= selectedExam.prompts.length) {
      handleExamEnd(nextIdx);
    } else {
      setPromptIndex(nextIdx);
      promptStartTimeRef.current = performance.now();
    }
  };

  const handleExamEnd = (finalPromptCount: number) => {
    if (!selectedExam) return;

    const accuracy = Math.round((correctHits / finalPromptCount) * 100);
    const avgSpeed = reactionTimes.length > 0 
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
      : 350;

    // Calculate Grade: S, A, B, C, D, F
    let grade = 'F';
    if (accuracy === 100 && avgSpeed <= 260) grade = 'S';
    else if (accuracy >= 90 && avgSpeed <= 320) grade = 'A';
    else if (accuracy >= 80 && avgSpeed <= 380) grade = 'B';
    else if (accuracy >= 70) grade = 'C';
    else if (accuracy >= 60) grade = 'D';

    saveCertificationGrade(selectedExam.id, grade);
    setGameState('completed');
    triggerHaptic(grade === 'S' || grade === 'A' ? 'levelup' : 'correct');
  };

  const startExam = (exam: Exam) => {
    setSelectedExam(exam);
    setGameState('countdown');
    setCountdown(3);
  };

  const currentPrompt = selectedExam?.prompts[promptIndex];
  const certifications = profile.certifications || {};

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 text-left relative overflow-hidden">
      
      {gameState === 'idle' && (
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
              Real Game Readiness Certificates
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Verify your mechanics against specialized gaming controller action mappings.
            </p>
          </div>

          {/* Exams list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXAMS.map((exam) => {
              const activeGrade = certifications[exam.id];
              return (
                <div 
                  key={exam.id}
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/10 flex flex-col justify-between h-48 relative overflow-hidden"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 font-display">{exam.subtitle}</span>
                      {activeGrade && (
                        <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-display font-black text-sm border ${
                          activeGrade === 'S' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400 shadow-lg shadow-yellow-500/10' :
                          activeGrade === 'A' ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' :
                          'border-zinc-700 bg-zinc-800 text-zinc-400'
                        }`}>
                          {activeGrade}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-white font-display uppercase pt-1">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {exam.description}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-zinc-900 mt-2">
                    <span className="text-[9px] font-black text-brand-cyan uppercase tracking-wider font-display">+{exam.xpReward} XP Certification</span>
                    <button
                      onClick={() => startExam(exam)}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-500/90 text-zinc-950 text-xs font-black font-display uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Launch Exam
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-zinc-950 border border-yellow-500 flex items-center justify-center text-white text-3xl font-black font-display animate-ping">
            {countdown}
          </div>
          <p className="text-xs uppercase font-extrabold text-yellow-500 tracking-widest font-display">Preparing Telemetry Monitor...</p>
        </div>
      )}

      {gameState === 'playing' && currentPrompt && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Action Prompt HUD */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-500 border-b border-zinc-900 pb-2.5 font-display uppercase">
              <span>{selectedExam?.name}</span>
              <span>Prompt {promptIndex + 1} / {selectedExam?.prompts.length}</span>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-2xl text-center space-y-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Action Event</span>
              <h3 className="text-3xl font-black text-yellow-500 font-display uppercase tracking-wider animate-pulse">
                {currentPrompt.action}
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                Press corresponding controller input
              </p>
            </div>

            <div className="p-3 bg-zinc-905 border border-zinc-900 rounded-xl text-[10px] text-zinc-500 leading-normal flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span>
                Exams measure pure reflex response times. Focus on locating correct inputs instantly without down-looking.
              </span>
            </div>
          </div>

          {/* Interactive Controller */}
          <div className="lg:col-span-7 flex flex-col justify-center py-6 min-h-[300px]">
            <ControllerView
              hidePanel={true}
              highlightedButton={currentPrompt.button}
              onButtonClick={handleGamepadPress}
              className="max-w-[420px] mx-auto"
            />
          </div>

        </div>
      )}

      {gameState === 'completed' && selectedExam && (
        <div className="py-10 text-center max-w-md mx-auto space-y-6">
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500">
              <Award className="h-8 w-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-white font-display uppercase tracking-wider mt-4">Exam Calibrations Saved</h3>
            <p className="text-xs text-zinc-500 mt-1">Grade badge loaded to profile registry card.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl text-left">
            <div>
              <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Exam Grade</span>
              <span className="text-2xl font-black text-yellow-400 font-display">
                {certifications[selectedExam.id]}
              </span>
            </div>
            <div>
              <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Accuracy</span>
              <span className="text-2xl font-black text-white font-display">
                {Math.round((correctHits / selectedExam.prompts.length) * 100)}%
              </span>
            </div>
            <div>
              <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Avg Speed</span>
              <span className="text-2xl font-black text-brand-cyan font-display">
                {reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 350}ms
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => startExam(selectedExam)}
              className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-500/95 text-zinc-950 font-black font-display text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Exam
            </button>
            <button
              onClick={() => {
                setSelectedExam(null);
                setGameState('idle');
              }}
              className="flex-1 py-3 border border-zinc-800 bg-zinc-900/40 text-zinc-300 font-bold font-display text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-900/60 transition-all cursor-pointer"
            >
              Back to Exams
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
