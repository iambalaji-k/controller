import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useApp } from '../context/AppContext';
import type { Drill } from '../types';
import { ControllerView } from '../components/ControllerView';
import type { ButtonKey } from '../components/ControllerView';
import { audioFeedback } from '../utils/audio';
import { 
  Target, Zap, Compass, Play, Lock, CheckCircle2, 
  Calendar, Award, Sliders, Flame, ChevronRight, ChevronLeft, X
} from 'lucide-react';

// Lazy-loaded components for route-splitting and bundle size reduction
const AdventureCampaign = lazy(() => import('../components/AdventureCampaign').then(m => ({ default: m.AdventureCampaign })));
const RecognitionTraining = lazy(() => import('../components/RecognitionTraining').then(m => ({ default: m.RecognitionTraining })));
const ReflexTraining = lazy(() => import('../components/ReflexTraining').then(m => ({ default: m.ReflexTraining })));
const MuscleMemoryTraining = lazy(() => import('../components/MuscleMemoryTraining').then(m => ({ default: m.MuscleMemoryTraining })));
const ComboTraining = lazy(() => import('../components/ComboTraining').then(m => ({ default: m.ComboTraining })));
const RhythmTraining = lazy(() => import('../components/RhythmTraining').then(m => ({ default: m.RhythmTraining })));
const AnalogStickAcademy = lazy(() => import('../components/AnalogStickAcademy').then(m => ({ default: m.AnalogStickAcademy })));
const GameLayoutAcademy = lazy(() => import('../components/GameLayoutAcademy').then(m => ({ default: m.GameLayoutAcademy })));
const TriggerMastery = lazy(() => import('../components/TriggerMastery').then(m => ({ default: m.TriggerMastery })));
const DpadMastery = lazy(() => import('../components/DpadMastery').then(m => ({ default: m.DpadMastery })));
const StickClickMastery = lazy(() => import('../components/StickClickMastery').then(m => ({ default: m.StickClickMastery })));

// Guided Learning Path & Systems
const GuidedLearningPath = lazy(() => import('../components/GuidedLearningPath').then(m => ({ default: m.GuidedLearningPath })));
const DailyWorkouts = lazy(() => import('../components/DailyWorkouts').then(m => ({ default: m.DailyWorkouts })));
const BeginnerTransition = lazy(() => import('../components/BeginnerTransition').then(m => ({ default: m.BeginnerTransition })));
const CertificationExams = lazy(() => import('../components/CertificationExams').then(m => ({ default: m.CertificationExams })));

const LoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 space-y-4">
    <div className="h-10 w-10 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin" />
    <span className="text-xs font-black text-brand-cyan font-display uppercase tracking-widest animate-pulse">
      Loading System Module...
    </span>
  </div>
);

export const TrainingPage: React.FC = () => {
  const { categories, profile, logDrillSession, unlockCategory, triggerHaptic } = useApp();
  const [activeTab, setActiveTab] = useState<'guided' | 'workouts' | 'transition' | 'exams' | 'campaign' | 'sandbox'>('guided');
  const [activeSandboxTab, setActiveSandboxTab] = useState<'menu' | 'recognition' | 'reflex' | 'memory' | 'mechanics' | 'combos' | 'rhythm' | 'stick' | 'layouts' | 'trigger' | 'dpad' | 'click'>('menu');
  
  // Drill simulator modal state
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  
  // Real calibration states
  const [drillGameState, setDrillGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [drillCountdown, setDrillCountdown] = useState(3);
  const [drillPrompts, setDrillPrompts] = useState<{ action: string; button: ButtonKey }[]>([]);
  const [drillPromptIndex, setDrillPromptIndex] = useState(0);
  const [drillCorrectHits, setDrillCorrectHits] = useState(0);
  const [drillReactionTimes, setDrillReactionTimes] = useState<number[]>([]);
  const [drillPromptStartTime, setDrillPromptStartTime] = useState(0);

  // Mock performance results options
  const [mockAccuracy, setMockAccuracy] = useState(90);
  const [mockReactionTime, setMockReactionTime] = useState(210);
  const [mockSpeed, setMockSpeed] = useState(85);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crosshair': return <Target className="h-5 w-5" />;
      case 'Zap': return <Zap className="h-5 w-5" />;
      case 'Compass': return <Compass className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const generateDrillPrompts = (drillId: string): { action: string; button: ButtonKey }[] => {
    let pool: ButtonKey[] = ['A', 'B', 'X', 'Y'];
    if (drillId === 'micro_adjustments') {
      pool = ['A', 'B', 'X', 'Y', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];
    } else if (drillId === 'target_snap') {
      pool = ['A', 'B', 'X', 'Y', 'LB', 'RB'];
    } else if (drillId === 'reaction_snap') {
      pool = ['A', 'B', 'X', 'Y', 'LT', 'RT'];
    } else if (drillId === 'slow_tracking') {
      pool = ['LeftStick', 'RightStick'];
    } else if (drillId === 'strafe_aim') {
      pool = ['L3', 'R3'];
    } else if (drillId === 'slide_cancel') {
      pool = ['B', 'A', 'RightStick', 'X'];
    } else {
      pool = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'L3', 'R3'];
    }

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

  const startDrillSimulation = (drill: Drill) => {
    setSelectedDrill(drill);
    setDrillGameState('idle');
    setDrillPrompts(generateDrillPrompts(drill.id));
  };

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (drillGameState === 'countdown') {
      if (drillCountdown > 0) {
        t = setTimeout(() => setDrillCountdown(drillCountdown - 1), 1000);
      } else {
        setDrillGameState('playing');
        setDrillPromptIndex(0);
        setDrillCorrectHits(0);
        setDrillReactionTimes([]);
        setDrillPromptStartTime(performance.now());
      }
    }
    return () => clearTimeout(t);
  }, [drillGameState, drillCountdown]);

  const handleDrillGamepadPress = (clickedButton: ButtonKey) => {
    if (drillGameState !== 'playing' || !selectedDrill) return;

    const currentPrompt = drillPrompts[drillPromptIndex];
    const timeSpent = performance.now() - drillPromptStartTime;

    const isCorrect = clickedButton === currentPrompt.button;

    if (isCorrect) {
      triggerHaptic('correct');
      audioFeedback.play('correct');
      setDrillCorrectHits(prev => prev + 1);
      setDrillReactionTimes(prev => [...prev, timeSpent]);
    } else {
      triggerHaptic('incorrect');
      audioFeedback.play('incorrect');
    }

    const nextIdx = drillPromptIndex + 1;
    if (nextIdx >= drillPrompts.length) {
      const finalCorrect = isCorrect ? drillCorrectHits + 1 : drillCorrectHits;
      const finalAccuracy = Math.round((finalCorrect / drillPrompts.length) * 100);
      const finalSpeed = drillReactionTimes.length > 0 
        ? Math.round(drillReactionTimes.reduce((a, b) => a + b, 0) / drillReactionTimes.length) 
        : 220;

      setMockAccuracy(finalAccuracy);
      setMockReactionTime(finalSpeed);
      const speedScore = Math.max(50, Math.min(100, Math.round(100 - (finalSpeed - 150) / 4)));
      setMockSpeed(speedScore);

      setDrillGameState('completed');
    } else {
      setDrillPromptIndex(nextIdx);
      setDrillPromptStartTime(performance.now());
    }
  };

  const handlePerformancePreset = (tier: 'gold' | 'silver' | 'bronze') => {
    if (tier === 'gold') {
      setMockAccuracy(96);
      setMockReactionTime(175);
      setMockSpeed(94);
    } else if (tier === 'silver') {
      setMockAccuracy(88);
      setMockReactionTime(220);
      setMockSpeed(80);
    } else {
      setMockAccuracy(76);
      setMockReactionTime(270);
      setMockSpeed(68);
    }
  };

  const submitDrillLog = () => {
    if (!selectedDrill) return;

    const mistakeHistory: Record<string, number> = {};
    if (mockAccuracy < 100) {
      const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];
      const totalMistakes = Math.max(1, Math.round((100 - mockAccuracy) / 4));
      for (let i = 0; i < totalMistakes; i++) {
        const randomBtn = BUTTONS[Math.floor(Math.random() * BUTTONS.length)];
        mistakeHistory[randomBtn] = (mistakeHistory[randomBtn] || 0) + 1;
      }
    }

    logDrillSession(selectedDrill.id, {
      accuracy: mockAccuracy,
      reactionTime: mockReactionTime,
      speed: mockSpeed,
      buttonMistakes: mistakeHistory
    });

    setSelectedDrill(null);
    setDrillGameState('idle');
  };

  const handleUnlockCategory = (catId: string) => {
    // Movement unlocks at level 3
    if (profile.level >= 3) {
      unlockCategory(catId);
    } else {
      alert(`Access Denied: You must reach Level 3 to unlock this module. Log drills under Centering or Flicks to earn XP first.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <section className="text-left space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight">
          Training Modules
        </h1>
        <p className="text-xs md:text-sm text-zinc-400">
          Select a training drill to calibrate specific thumbstick controls and trigger-reflex vectors.
        </p>
      </section>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-zinc-900 pb-2 gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('guided')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'guided'
              ? 'bg-zinc-900/60 text-brand-cyan border-b-2 border-brand-cyan'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Compass className="h-4 w-4" />
          Guided Path
        </button>
        <button
          onClick={() => setActiveTab('workouts')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'workouts'
              ? 'bg-zinc-900/60 text-brand-magenta border-b-2 border-brand-magenta'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Flame className="h-4 w-4" />
          Daily Workouts
        </button>
        <button
          onClick={() => setActiveTab('transition')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'transition'
              ? 'bg-zinc-900/60 text-yellow-500 border-b-2 border-yellow-500'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calendar className="h-4 w-4" />
          14-Day Transition
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'exams'
              ? 'bg-zinc-900/60 text-brand-purple border-b-2 border-brand-purple'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Award className="h-4 w-4" />
          Combat Exams
        </button>
        <button
          onClick={() => setActiveTab('campaign')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'campaign'
              ? 'bg-zinc-900/60 text-brand-cyan border-b-2 border-brand-cyan'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Target className="h-4 w-4" />
          Adventure Campaign
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
            activeTab === 'sandbox'
              ? 'bg-zinc-900/60 text-brand-purple border-b-2 border-brand-purple'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sliders className="h-4 w-4" />
          Calibration Sandbox
        </button>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        {activeTab === 'guided' && <GuidedLearningPath />}
        {activeTab === 'workouts' && <DailyWorkouts />}
        {activeTab === 'transition' && <BeginnerTransition />}
        {activeTab === 'exams' && <CertificationExams />}
        {activeTab === 'campaign' && <AdventureCampaign />}
        
        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            {activeSandboxTab === 'menu' ? (
              <div className="space-y-6">
                <div className="text-left max-w-xl">
                  <span className="text-[10px] uppercase font-black tracking-widest text-brand-cyan font-display block">Calibrate & Train</span>
                  <h2 className="text-xl font-black text-white font-display uppercase">Sandbox Mini-Games</h2>
                  <p className="text-xs text-zinc-400">
                    Isolate specific gameplay vectors and inputs to train muscle memory mechanics at your own pace.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'recognition', phase: 'Phase 1', name: 'Recognition Protocols', desc: 'Identify flashing controller buttons and names under timed flashcard trials.', color: 'border-brand-cyan text-brand-cyan bg-brand-cyan/5' },
                    { id: 'reflex', phase: 'Phase 2', name: 'Reflex Protocols', desc: 'Test controller inputs under pressure with Rapid Fire and Survival mode.', color: 'border-brand-magenta text-brand-magenta bg-brand-magenta/5' },
                    { id: 'memory', phase: 'Phase 3', name: 'Muscle Memory Builder', desc: 'Blind input sequences, hidden overlays, and voice-guided audio drills.', color: 'border-brand-purple text-brand-purple bg-brand-purple/5' },
                    { id: 'mechanics', phase: 'Phase 4', name: 'Muscle Mechanics', desc: 'Standard target-based flick and trigger drills to configure physical input baselines.', color: 'border-zinc-700 text-zinc-400 bg-zinc-900/20' },
                    { id: 'combos', phase: 'Phase 5', name: 'Combo Sequences', desc: 'Execute string inputs with precise latency and strict release window tolerances.', color: 'border-brand-cyan text-brand-cyan bg-brand-cyan/5' },
                    { id: 'rhythm', phase: 'Phase 6', name: 'Rhythm Sync Engine', desc: 'Sync buttons with beat notes moving towards key zones to build rhythm muscle memory.', color: 'border-brand-magenta text-brand-magenta bg-brand-magenta/5' },
                    { id: 'stick', phase: 'Phase 7', name: 'Analog Stick Academy', desc: 'Aim snapping, maze navigation, and circular tracing precision loops.', color: 'border-brand-purple text-brand-purple bg-brand-purple/5' },
                    { id: 'layouts', phase: 'Phase 8', name: 'AAA Game Layouts', desc: 'Learn common controller mapping schemas for Arkham combat, GTA driving, AC parkour, and Elden Ring.', color: 'border-zinc-700 text-zinc-400 bg-zinc-900/20' },
                    { id: 'trigger', phase: 'Phase 9', name: 'Trigger Mastery', desc: 'Isolate analog trigger depth control and high-speed RT/LT reflex snaps.', color: 'border-brand-cyan text-brand-cyan bg-brand-cyan/5' },
                    { id: 'dpad', phase: 'Phase 10', name: 'D-Pad Mastery', desc: 'Calibrate rapid directional taps, item select wheels, and crosskey layouts.', color: 'border-brand-magenta text-brand-magenta bg-brand-magenta/5' },
                    { id: 'click', phase: 'Phase 11', name: 'Stick Click Mastery', desc: 'Develop physical thumb dexterity to press L3/R3 clicks while moving sticks.', color: 'border-brand-purple text-brand-purple bg-brand-purple/5' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setActiveSandboxTab(mode.id as any)}
                      className={`glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-44 text-left hover:border-brand-cyan/40 hover:shadow-lg hover:shadow-brand-cyan/5 transition-all duration-300 group cursor-pointer`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-display">
                            {mode.phase}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-brand-cyan group-hover:translate-x-0.5 transition-all animate-in fade-in" />
                        </div>
                        <h3 className="text-sm font-black text-white font-display uppercase pt-1.5 group-hover:text-brand-cyan transition-colors">
                          {mode.name}
                        </h3>
                        <p className="text-xs text-zinc-500 leading-normal line-clamp-2">
                          {mode.desc}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-zinc-900 mt-2 flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold text-brand-purple tracking-widest">
                          Launch Sandbox
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sandbox Header / Switcher */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-900/30 border border-zinc-900 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveSandboxTab('menu')}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      All Modes
                    </button>
                    <div className="h-4 w-px bg-zinc-800" />
                    <div className="text-left">
                      <span className="text-[9px] uppercase font-black tracking-widest text-brand-cyan font-display block">Sandbox Calibration</span>
                      <h2 className="text-xs font-black text-white font-display uppercase">
                        {
                          {
                            recognition: 'Phase 1: Recognition Protocols',
                            reflex: 'Phase 2: Reflex Protocols',
                            memory: 'Phase 3: Muscle Memory Protocols',
                            mechanics: 'Phase 4: Muscle Mechanics Calibrations',
                            combos: 'Phase 5: Combo Training Sequences',
                            rhythm: 'Phase 6: Rhythm Synchronization Sync',
                            stick: 'Phase 7: Analog Stick Academy',
                            layouts: 'Phase 8: AAA Game Layout Academy',
                            trigger: 'Phase 9: Trigger Mastery Calibrations',
                            dpad: 'Phase 10: D-Pad Mastery Calibrations',
                            click: 'Phase 11: Click Mastery Calibrations',
                          }[activeSandboxTab] || ''
                        }
                      </h2>
                    </div>
                  </div>
                  
                  {/* Quick-switch select dropdown */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={activeSandboxTab}
                      onChange={(e) => setActiveSandboxTab(e.target.value as any)}
                      className="w-full sm:w-64 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold py-2 px-3 rounded-xl transition-colors cursor-pointer focus:outline-none focus:border-brand-cyan"
                    >
                      <option value="menu">--- Select Sandbox Mode ---</option>
                      <option value="recognition">Phase 1: Recognition Protocols</option>
                      <option value="reflex">Phase 2: Reflex Protocols</option>
                      <option value="memory">Phase 3: Muscle Memory Builder</option>
                      <option value="mechanics">Phase 4: Muscle Mechanics</option>
                      <option value="combos">Phase 5: Combo Sequences</option>
                      <option value="rhythm">Phase 6: Rhythm Sync Engine</option>
                      <option value="stick">Phase 7: Analog Stick Academy</option>
                      <option value="layouts">Phase 8: AAA Game Layouts</option>
                      <option value="trigger">Phase 9: Trigger Mastery</option>
                      <option value="dpad">Phase 10: D-Pad Mastery</option>
                      <option value="click">Phase 11: Click Mastery</option>
                    </select>
                  </div>
                </div>

                {/* Actual sandbox component rendered dynamically */}
                <div>
                  {activeSandboxTab === 'recognition' && <RecognitionTraining />}
                  {activeSandboxTab === 'reflex' && <ReflexTraining />}
                  {activeSandboxTab === 'memory' && <MuscleMemoryTraining />}
                  {activeSandboxTab === 'combos' && <ComboTraining />}
                  {activeSandboxTab === 'rhythm' && <RhythmTraining />}
                  {activeSandboxTab === 'stick' && <AnalogStickAcademy />}
                  {activeSandboxTab === 'layouts' && <GameLayoutAcademy />}
                  {activeSandboxTab === 'trigger' && <TriggerMastery />}
                  {activeSandboxTab === 'dpad' && <DpadMastery />}
                  {activeSandboxTab === 'click' && <StickClickMastery />}
                  
                  {activeSandboxTab === 'mechanics' && (
                    <div className="space-y-8 text-left">
                      {categories.map((category) => (
                        <div key={category.id} className="space-y-4">
                          
                          {/* Category Banner header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400`}>
                                {getCategoryIcon(category.icon)}
                              </div>
                              <div>
                                <h2 className="text-sm font-black font-display uppercase tracking-wider text-white">
                                  {category.name}
                                </h2>
                                <p className="text-xs text-zinc-500">{category.description}</p>
                              </div>
                            </div>

                            {/* Unlock / Tier indicator */}
                            <div>
                              {category.isLocked ? (
                                <button
                                  onClick={() => handleUnlockCategory(category.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 text-xs font-bold font-display uppercase tracking-wider hover:bg-yellow-500/10 transition-colors"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  Unlock (LVL 3 Required)
                                </button>
                              ) : (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400">
                                  {category.difficulty}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Drills Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {category.drills.map((drill) => {
                              const isLocked = category.isLocked;
                              return (
                                <div
                                  key={drill.id}
                                  className={`glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-48 relative transition-all duration-300 ${
                                    isLocked
                                      ? 'opacity-50 grayscale'
                                      : 'glass-panel-hover'
                                  }`}
                                >
                                  {/* Top part */}
                                  <div className="text-left space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                        drill.difficulty === 'Beginner' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                        drill.difficulty === 'Intermediate' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                        drill.difficulty === 'Advanced' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                      }`}>
                                        {drill.difficulty}
                                      </span>
                                      <span className="text-xs text-zinc-500 font-semibold">{drill.duration}</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white font-display uppercase pt-2">
                                      {drill.title}
                                    </h3>
                                    <p className="text-xs text-zinc-500 leading-normal line-clamp-2">
                                      {drill.description}
                                    </p>
                                  </div>

                                  {/* Bottom part */}
                                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900/60 mt-2">
                                    <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider">
                                      +{drill.xpReward} XP Reward
                                    </span>
                                    
                                    {isLocked ? (
                                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-600">
                                        <Lock className="h-3.5 w-3.5" />
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => startDrillSimulation(drill)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/10 hover:shadow-brand-cyan/20 transition-all duration-200 cursor-pointer"
                                      >
                                        <Play className="h-3.5 w-3.5 fill-zinc-950 stroke-zinc-950" />
                                        Calibrate
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        )}
      </Suspense>

      {/* Drill Simulation Overlay Modal */}
      {selectedDrill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel border border-brand-purple/20 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan">Calibration Practice Module</span>
                <h3 className="text-base font-extrabold text-white font-display uppercase">{selectedDrill.title}</h3>
              </div>
              {drillGameState !== 'countdown' && drillGameState !== 'playing' && (
                <button
                  onClick={() => setSelectedDrill(null)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 bg-zinc-800/40 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
              
              {drillGameState === 'idle' && (
                <div className="space-y-4 py-6 text-center">
                  <span className="text-xs text-zinc-400 font-semibold block">
                    {selectedDrill.description}
                  </span>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    This training module will test your ability to press key inputs rapidly and accurately. Ready to initiate?
                  </p>
                  <button
                    onClick={() => {
                      setDrillGameState('countdown');
                      setDrillCountdown(3);
                      triggerHaptic('correct');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/10"
                  >
                    Start Calibration Drill
                  </button>
                </div>
              )}

              {drillGameState === 'countdown' && (
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full bg-zinc-900 border-2 border-brand-cyan/50 flex items-center justify-center text-white text-3xl font-black font-display animate-pulse shadow-lg shadow-brand-cyan/10">
                    {drillCountdown}...
                  </div>
                  <span className="text-xs font-bold text-brand-cyan uppercase font-display animate-pulse">
                    Preparing Telemetry Sensors
                  </span>
                </div>
              )}

              {drillGameState === 'playing' && drillPrompts[drillPromptIndex] && (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase font-display w-full max-w-md">
                    <span>Target Calibration</span>
                    <span>Prompt {drillPromptIndex + 1} / {drillPrompts.length}</span>
                  </div>
                  <h3 className="text-2xl font-black text-brand-purple font-display uppercase tracking-wider animate-pulse text-center">
                    {drillPrompts[drillPromptIndex].action}
                  </h3>
                  <div className="w-full max-w-[280px]">
                    <ControllerView
                      hidePanel={true}
                      highlightedButton={drillPrompts[drillPromptIndex].button}
                      onButtonClick={handleDrillGamepadPress}
                      className="mx-auto"
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

              {drillGameState === 'completed' && (
                <div className="space-y-6 w-full text-left">
                  <div className="flex items-center gap-3 p-4 bg-brand-green/10 border border-brand-green/20 rounded-2xl">
                    <CheckCircle2 className="h-8 w-8 text-brand-green flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase font-display">Telemetry Log Synthesized!</h4>
                      <p className="text-[10px] text-zinc-400">Your practice results are mapped below. You can save or adjust them before syncing.</p>
                    </div>
                  </div>

                  {/* Preset performance triggers */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-display">Select Practice Quality Preset</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePerformancePreset('gold')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all duration-200 ${
                          mockAccuracy === 96
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-extrabold font-display">GOLD TIER</span>
                        <span className="text-[9px] font-medium opacity-80">96% Acc / 175ms</span>
                      </button>
                      <button
                        onClick={() => handlePerformancePreset('silver')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all duration-200 ${
                          mockAccuracy === 88
                            ? 'border-zinc-300 bg-zinc-300/10 text-zinc-200'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-extrabold font-display">SILVER TIER</span>
                        <span className="text-[9px] font-medium opacity-80">88% Acc / 220ms</span>
                      </button>
                      <button
                        onClick={() => handlePerformancePreset('bronze')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all duration-200 ${
                          mockAccuracy === 76
                            ? 'border-amber-700 bg-amber-700/10 text-amber-500'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-extrabold font-display">BRONZE TIER</span>
                        <span className="text-[9px] font-medium opacity-80">76% Acc / 270ms</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual adjustment sliders */}
                  <div className="space-y-3 pt-3 border-t border-zinc-900">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-display">Fine-Tune Stats Parameters</span>
                    
                    {/* Accuracy Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-zinc-400 font-display uppercase text-[10px]">Aim Accuracy</span>
                        <span className="text-brand-cyan">{mockAccuracy}%</span>
                      </div>
                      <input
                        type="range" min="60" max="100" value={mockAccuracy}
                        onChange={(e) => setMockAccuracy(Number(e.target.value))}
                        className="w-full accent-brand-cyan bg-zinc-900 rounded-lg appearance-none h-1.5"
                      />
                    </div>

                    {/* Reaction Time Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-zinc-400 font-display uppercase text-[10px]">Reaction Time</span>
                        <span className="text-brand-purple">{mockReactionTime}ms</span>
                      </div>
                      <input
                        type="range" min="150" max="350" value={mockReactionTime}
                        onChange={(e) => setMockReactionTime(Number(e.target.value))}
                        className="w-full accent-brand-purple bg-zinc-900 rounded-lg appearance-none h-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex justify-end gap-2">
              <button
                onClick={() => setSelectedDrill(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
                disabled={drillGameState === 'countdown' || drillGameState === 'playing'}
              >
                Discard
              </button>
              {drillGameState === 'completed' && (
                <button
                  onClick={submitDrillLog}
                  className="px-5 py-2 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/20 transition-all duration-200"
                >
                  Synchronize Data (+{selectedDrill.xpReward} XP)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
