import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { audioFeedback } from '../utils/audio';
import { 
  Play, Lock, CheckCircle2, Compass, Star
} from 'lucide-react';

interface GuideLevel {
  levelNum: number;
  name: string;
  description: string;
  drillId: string;
  modeKey: string; // targets training page tab name
  highlights: ButtonKey[];
  focusDescription: string;
}

export const GuidedLearningPath: React.FC = () => {
  const { profile, incrementLearningPathLevel, triggerHaptic, logDrillSession } = useApp();
  const currentLevel = profile.learningPathLevel || 1;

  // Active testing modal state
  const [testingLevel, setTestingLevel] = useState<GuideLevel | null>(null);
  const [testActive, setTestActive] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [testScore, setTestScore] = useState<number | null>(null);

  // Real test telemetry states
  const [prompts, setPrompts] = useState<{ action: string; button: ButtonKey }[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [promptStartTime, setPromptStartTime] = useState(0);

  const LEVELS: GuideLevel[] = [
    {
      levelNum: 1,
      name: 'Face Buttons',
      description: 'Master A, B, X, Y recognition instantly without looking down.',
      drillId: 'micro_adjustments',
      modeKey: 'recognition',
      highlights: ['A', 'B', 'X', 'Y'],
      focusDescription: 'Develop instinctive muscle memory for the primary interaction cluster.'
    },
    {
      levelNum: 2,
      name: 'Bumpers',
      description: 'Isolate LB and RB bumper click triggers with index finger positioning.',
      drillId: 'target_snap',
      modeKey: 'reflex',
      highlights: ['LB', 'RB'],
      focusDescription: 'Coordinate quick reflex bumper clicks used for parries and block items.'
    },
    {
      levelNum: 3,
      name: 'Triggers',
      description: 'Practice analog pull tension and response calibrations on LT and RT.',
      drillId: 'reaction_snap',
      modeKey: 'trigger',
      highlights: ['LT', 'RT'],
      focusDescription: 'Tweak middle finger response times for rapid firing and throttle acceleration.'
    },
    {
      levelNum: 4,
      name: 'D-Pad Directions',
      description: 'Rapidly navigate menu lists and select hotkey direction items.',
      drillId: 'micro_adjustments',
      modeKey: 'dpad',
      highlights: ['DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'],
      focusDescription: 'Differentiate directional arrows instantly for quick items selection.'
    },
    {
      levelNum: 5,
      name: 'Analog Sticks',
      description: 'Coordinate micro centering adjustments, circle traces, and tracking aim.',
      drillId: 'slow_tracking',
      modeKey: 'stick',
      highlights: ['LeftStick', 'RightStick'],
      focusDescription: 'Practice continuous thumb tracking loops to maximize aim-assist bubble friction.'
    },
    {
      levelNum: 6,
      name: 'Stick Clicks (L3/R3)',
      description: 'Lock sticks down while holding directions for sprint and zoom scopes.',
      drillId: 'strafe_aim',
      modeKey: 'click',
      highlights: ['L3', 'R3'],
      focusDescription: 'Overcome beginner stress of clicking thumbsticks under high-speed movement.'
    },
    {
      levelNum: 7,
      name: 'Mixed Inputs Coordination',
      description: 'Transition fluidly between joysticks, bumpers, and face buttons.',
      drillId: 'slide_cancel',
      modeKey: 'combos',
      highlights: ['LeftStick', 'LB', 'A'],
      focusDescription: 'Train thumb-finger split coordination across asymmetric physical layouts.'
    },
    {
      levelNum: 8,
      name: 'Combat Input Cancels',
      description: 'Practice high-difficulty sequences used in professional layouts.',
      drillId: 'slide_cancel',
      modeKey: 'layouts',
      highlights: ['RightStick', 'X', 'B'],
      focusDescription: 'Sequence weapon swaps and camera cancels to establish flow.'
    },
    {
      levelNum: 9,
      name: 'Blind Controller Mastery',
      description: 'Rely solely on audio voice cues and tactical sound markers.',
      drillId: 'strafe_aim',
      modeKey: 'memory',
      highlights: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT'],
      focusDescription: 'Complete visual occlusion tests: prove your hands work independently of sight.'
    },
    {
      levelNum: 10,
      name: 'Real Game Readiness',
      description: 'Verify your muscle memory against AAA simulator boss parries.',
      drillId: 'advanced_orbit',
      modeKey: 'layouts',
      highlights: ['A', 'B', 'LeftStick', 'RightStick', 'LT', 'RT'],
      focusDescription: 'Obtain elite combat certifications for GTA, Elden Ring, and Batman.'
    }
  ];

  const generatePrompts = (lvl: GuideLevel): { action: string; button: ButtonKey }[] => {
    const pool = lvl.highlights;
    const count = 10;
    const generated: { action: string; button: ButtonKey }[] = [];
    for (let i = 0; i < count; i++) {
      const btn = pool[Math.floor(Math.random() * pool.length)];
      let actName = `PRESS ${btn}`;
      if (btn === 'LeftStick' || btn === 'RightStick') actName = `DEFLECT ${btn === 'LeftStick' ? 'LEFT' : 'RIGHT'} STICK`;
      else if (btn === 'L3' || btn === 'R3') actName = `CLICK ${btn === 'L3' ? 'LEFT' : 'RIGHT'} STICK`;
      else if (btn === 'LT' || btn === 'RT') actName = `PULL ${btn === 'LT' ? 'LEFT' : 'RIGHT'} TRIGGER`;
      else if (btn.startsWith('Dpad')) actName = `TAP DPAD ${btn.replace('Dpad', '')}`;
      generated.push({ action: actName, button: btn });
    }
    return generated;
  };

  const handleLevelTestLaunch = (lvl: GuideLevel) => {
    setTestingLevel(lvl);
    setTestActive(true);
    setGameState('idle');
    setTestScore(null);
    setPrompts(generatePrompts(lvl));
  };

  const startTest = () => {
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
    if (gameState !== 'playing' || !testingLevel) return;

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

  const completeTest = () => {
    if (!testingLevel || testScore === null) return;
    
    const avgSpeed = reactionTimes.length > 0 
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
      : 205;

    // Log drill
    logDrillSession(testingLevel.drillId, {
      accuracy: testScore,
      reactionTime: avgSpeed,
    });

    if (testScore >= 85) {
      if (testingLevel.levelNum === currentLevel && currentLevel < 10) {
        incrementLearningPathLevel();
      }
    }
    setTestActive(false);
    setTestingLevel(null);
  };

  const currentPrompt = prompts[promptIndex];
  const avgSpeed = reactionTimes.length > 0 
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
    : 0;

  return (
    <div className="space-y-6 text-left">
      
      {/* Overview stats */}
      <section className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="h-5 w-5 text-brand-cyan" />
            Operative Guided Learning Path
          </h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-lg">
            Progress sequentially through 10 tactical training levels. Complete Level tests with 85%+ accuracy to unlock advanced controller muscle memory tiers.
          </p>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-lg flex items-center justify-center font-display font-black">
            L{currentLevel}
          </div>
          <div>
            <span className="block text-[8px] uppercase font-bold text-zinc-500 font-display">Active Level</span>
            <span className="text-xs font-black text-white uppercase font-display">
              {LEVELS[currentLevel - 1]?.name || 'Fully Completed'}
            </span>
          </div>
        </div>
      </section>

      {/* Levels list tree */}
      <div className="space-y-4">
        {LEVELS.map((lvl) => {
          const isUnlocked = lvl.levelNum <= currentLevel;
          const isCompleted = lvl.levelNum < currentLevel;
          const isActive = lvl.levelNum === currentLevel;

          return (
            <div 
              key={lvl.levelNum}
              className={`glass-panel p-5 rounded-2xl border relative flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300 ${
                isActive ? 'border-brand-purple bg-brand-purple/5 shadow-md shadow-brand-purple/5' :
                isCompleted ? 'border-brand-green/30 bg-brand-green/2' :
                'border-white/5 opacity-55 grayscale'
              }`}
            >
              
              {/* Level indicator / descriptor info */}
              <div className="flex items-start gap-4 flex-1">
                <div className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center font-display font-black border flex-shrink-0 ${
                  isCompleted ? 'border-brand-green bg-brand-green/10 text-brand-green' :
                  isActive ? 'border-brand-purple bg-brand-purple/10 text-brand-purple animate-pulse' :
                  'border-zinc-850 bg-zinc-900 text-zinc-500'
                }`}>
                  <span className="text-[9px] uppercase leading-none opacity-65">LVL</span>
                  <span className="text-lg leading-none">{lvl.levelNum}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white uppercase font-display">
                      {lvl.name}
                    </h3>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-green uppercase font-display bg-brand-green/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" />
                        Mastered
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-cyan uppercase font-display bg-brand-cyan/10 px-1.5 py-0.5 rounded animate-pulse">
                        Active Exam
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">{lvl.description}</p>
                  <p className="text-[10px] text-zinc-500 font-semibold">{lvl.focusDescription}</p>
                </div>
              </div>

              {/* Active hardware indicators */}
              <div className="hidden lg:block w-36">
                <div className="flex flex-wrap gap-1">
                  {lvl.highlights.map((btn) => (
                    <span 
                      key={btn}
                      className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500"
                    >
                      {btn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Launcher button block */}
              <div className="flex items-center gap-3">
                {isUnlocked ? (
                  <button
                    onClick={() => handleLevelTestLaunch(lvl)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black font-display uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? 'bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 shadow-lg shadow-brand-cyan/15 hover:shadow-brand-cyan/25'
                        : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {isActive ? 'Start Exam' : 'Practice Review'}
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-950/40 text-zinc-700 flex items-center gap-1.5 text-xs font-semibold uppercase font-display">
                    <Lock className="h-4 w-4" />
                    Locked
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Level Test Modal */}
      {testActive && testingLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border border-brand-purple/30 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col text-center p-6 space-y-6">
            
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple font-display">
                Guided Level {testingLevel.levelNum} Certification
              </span>
              <h3 className="text-lg font-black text-white font-display uppercase">
                {testingLevel.name} Verification
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Demonstrate mechanics on targeted vectors. Score $\ge 85\%$ accuracy to advance.
              </p>
            </div>

            {/* Test Animation HUD */}
            <div className="py-6 bg-zinc-900/10 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center space-y-4 w-full min-h-[140px]">
              {gameState === 'idle' && (
                <div className="space-y-1 py-4">
                  <span className="text-xs text-zinc-500">Telemetry calibrator ready.</span>
                  <p className="text-[10px] text-zinc-600 font-semibold">Exams test you on level key buttons in rapid succession.</p>
                </div>
              )}

              {gameState === 'countdown' && (
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin mx-auto" />
                  <span className="text-xs font-bold text-brand-cyan uppercase font-display animate-pulse">
                    Starting in {countdown}...
                  </span>
                </div>
              )}

              {gameState === 'playing' && currentPrompt && (
                <div className="space-y-4 w-full px-4">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase font-display">
                    <span>Active Target</span>
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
                <div className="space-y-3 w-full px-6">
                  <span className="text-3xl font-black font-display text-white">{testScore}%</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Test Score: {testScore >= 85 ? 'PASSED' : 'FAILED'}
                  </p>
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <Star 
                        key={s}
                        className={`h-4 w-4 ${
                          testScore >= 95 ? 'text-yellow-500 fill-yellow-500' :
                          testScore >= 85 && s <= 2 ? 'text-yellow-500 fill-yellow-500' :
                          testScore >= 70 && s <= 1 ? 'text-yellow-500 fill-yellow-500' :
                          'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2 bg-zinc-950/60 border border-zinc-900 p-2.5 rounded-xl text-left mt-2">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase font-display">
                      <span>Average Reaction Time</span>
                      <span className="text-brand-cyan">{avgSpeed}ms</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
              <button
                onClick={() => setTestActive(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={gameState === 'countdown' || gameState === 'playing'}
              >
                Cancel
              </button>
              
              {gameState === 'idle' && (
                <button
                  onClick={startTest}
                  className="px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider"
                >
                  Initiate Trial
                </button>
              )}

              {gameState === 'completed' && testScore !== null && (
                <>
                  {testScore < 85 ? (
                    <button
                      onClick={startTest}
                      className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-500/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider"
                    >
                      Retry Exam
                    </button>
                  ) : (
                    <button
                      onClick={completeTest}
                      className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/95 text-white text-xs font-black font-display uppercase tracking-wider"
                    >
                      {testingLevel.levelNum === currentLevel && currentLevel < 10 ? 'Unlock Next Level' : 'Submit Review Score'}
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
