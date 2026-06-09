import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Drill } from '../types';
import { ControllerSvg } from '../components/ControllerSvg';
import * as Icons from 'lucide-react';
import { Target, Zap, Compass, Play, Lock, CheckCircle2 } from 'lucide-react';

export const TrainingPage: React.FC = () => {
  const { categories, profile, logDrillSession, unlockCategory } = useApp();
  
  // Drill simulator modal state
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<'idle' | 'running' | 'completed'>('idle');
  const [timer, setTimer] = useState(4);
  const [activePart, setActivePart] = useState<'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null>(null);
  
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

  // Run simulation timer and gamepad animations
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSimulating && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
        
        // Cycle active controller parts to simulate input
        const parts: ('left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers')[] = [
          'left-stick', 'right-stick', 'buttons', 'triggers', 'dpad'
        ];
        const randomPart = parts[Math.floor(Math.random() * parts.length)];
        setActivePart(randomPart);
      }, 800);
    } else if (timer === 0 && isSimulating) {
      setIsSimulating(false);
      setSimulationStep('completed');
      setActivePart(null);
    }

    return () => clearInterval(interval);
  }, [isSimulating, timer]);

  const startDrillSimulation = (drill: Drill) => {
    setSelectedDrill(drill);
    setSimulationStep('running');
    setTimer(4);
    setIsSimulating(true);
  };

  const handlePerformancePreset = (tier: 'gold' | 'silver' | 'bronze') => {
    if (tier === 'gold') {
      setMockAccuracy(96);
      setMockReactionTime(175); // Should trigger speed_demon achievement!
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

    logDrillSession(selectedDrill.id, {
      accuracy: mockAccuracy,
      reactionTime: mockReactionTime,
      speed: mockSpeed
    });

    // Reset modal state
    setSelectedDrill(null);
    setSimulationStep('idle');
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

      {/* Modules lists */}
      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            
            {/* Category Banner header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400`}>
                  {getCategoryIcon(category.icon)}
                </div>
                <div className="text-left">
                  <h2 className="text-base font-bold font-display uppercase tracking-wider text-white">
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
              {simulationStep !== 'running' && (
                <button
                  onClick={() => setSelectedDrill(null)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 bg-zinc-800/40 rounded-lg transition-colors"
                >
                  <Icons.X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
              
              {simulationStep === 'running' && (
                <div className="space-y-6 w-full flex flex-col items-center">
                  {/* Countdown number */}
                  <div className="h-20 w-20 rounded-full bg-zinc-900 border-2 border-brand-cyan/50 flex items-center justify-center text-white text-3xl font-black font-display animate-pulse shadow-lg shadow-brand-cyan/10">
                    {timer}s
                  </div>
                  
                  <div className="w-full max-w-[200px]">
                    <ControllerSvg type={profile.controllerType} activePart={activePart} />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider animate-pulse font-display">
                      Intercepting Controller Telemetry...
                    </span>
                    <p className="text-[10px] text-zinc-500 max-w-xs">
                      Simulating stick tilt movements and bumper presses to register accuracy indices.
                    </p>
                  </div>
                </div>
              )}

              {simulationStep === 'completed' && (
                <div className="space-y-6 w-full text-left">
                  <div className="flex items-center gap-3 p-4 bg-brand-green/10 border border-brand-green/20 rounded-2xl">
                    <CheckCircle2 className="h-8 w-8 text-brand-green flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase font-display">Telemetry Log Synthesized!</h4>
                      <p className="text-[10px] text-zinc-400">Select a performance profile below to simulate score submission & XP calculations.</p>
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
                disabled={simulationStep === 'running'}
              >
                Discard
              </button>
              {simulationStep === 'completed' && (
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
