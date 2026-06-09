import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ControllerSvg } from './ControllerSvg';
import { 
  Shield, Star, Lock, Play, 
  Crown, Compass, Zap, Award, CheckCircle2, RotateCcw, Trophy 
} from 'lucide-react';

interface Mission {
  id: string;
  name: string;
  description: string;
  drillId: string;
  xpReward: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

interface World {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
  missions: Mission[];
}

export const AdventureCampaign: React.FC = () => {
  const { profile, logDrillSession, triggerHaptic } = useApp();

  // Campaign progression state
  const [campaignProgress, setCampaignProgress] = useState<Record<string, { completed: boolean; stars: number }>>({});
  const [selectedWorldId, setSelectedWorldId] = useState<number>(1);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  // Simulation states
  const [simStep, setSimStep] = useState<'idle' | 'running' | 'completed'>('idle');
  const [simTimer, setSimTimer] = useState(4);
  const [activePart, setActivePart] = useState<'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null>(null);

  // Simulated performance selectors
  const [mockAcc, setMockAcc] = useState(90);
  const [mockRt, setMockRt] = useState(210);

  const WORLDS: World[] = [
    {
      id: 1,
      name: 'Basic Training',
      description: 'Master the core controller layout and visual button configurations.',
      icon: <Compass className="h-5 w-5" />,
      colorClass: 'border-brand-cyan text-brand-cyan bg-brand-cyan/5',
      glowClass: 'shadow-brand-cyan/20',
      missions: [
        { id: 'm1_1', name: 'Recall Protocol', description: 'Visually identify flashing buttons on command.', drillId: 'slow_tracking', xpReward: 100, difficulty: 'Beginner' },
        { id: 'm1_2', name: 'Face Button Flicks', description: 'React quickly to name highlighted face buttons.', drillId: 'micro_adjustments', xpReward: 120, difficulty: 'Beginner' }
      ]
    },
    {
      id: 2,
      name: 'Reflex Academy',
      description: 'Train fast-reaction button clicks and split-second decision vectors.',
      icon: <Zap className="h-5 w-5" />,
      colorClass: 'border-brand-purple text-brand-purple bg-brand-purple/5',
      glowClass: 'shadow-brand-purple/20',
      missions: [
        { id: 'm2_1', name: 'Trigger Reflex Burst', description: 'Tap triggers instantly as prompts flash.', drillId: 'reaction_snap', xpReward: 150, difficulty: 'Intermediate' },
        { id: 'm2_2', name: 'Red Alert Survival', description: 'Rapidly input face button prompts with zero error tolerance.', drillId: 'target_snap', xpReward: 180, difficulty: 'Intermediate' }
      ]
    },
    {
      id: 3,
      name: 'Combo Arena',
      description: 'Coordinate multiple buttons together for tactical movement patterns.',
      icon: <Crown className="h-5 w-5" />,
      colorClass: 'border-brand-magenta text-brand-magenta bg-brand-magenta/5',
      glowClass: 'shadow-brand-magenta/20',
      missions: [
        { id: 'm3_1', name: 'Slide Cancel Protocol', description: 'Alternate crouches and jumps while maintaining stick aim.', drillId: 'slide_cancel', xpReward: 200, difficulty: 'Advanced' },
        { id: 'm3_2', name: 'Weapon Wheel Swap', description: 'Alternate triggers and bumpers in fast combos.', drillId: 'strafe_aim', xpReward: 220, difficulty: 'Advanced' }
      ]
    },
    {
      id: 4,
      name: 'Analog Temple',
      description: 'Hone aiming precision, circle tracing, and diagonal target snapping.',
      icon: <Compass className="h-5 w-5" />,
      colorClass: 'border-brand-cyan text-brand-cyan bg-brand-cyan/5',
      glowClass: 'shadow-brand-cyan/20',
      missions: [
        { id: 'm4_1', name: 'Aim Snap Maze', description: 'Navigate sticks precisely through coordinate boundaries.', drillId: 'target_snap', xpReward: 250, difficulty: 'Advanced' },
        { id: 'm4_2', name: 'Centering orbit', description: 'Orbit analog sticks to trace perfect circles.', drillId: 'advanced_orbit', xpReward: 260, difficulty: 'Advanced' }
      ]
    },
    {
      id: 5,
      name: 'Trigger Fortress',
      description: 'Master trigger pressure sensitivities and alternating index rhythms.',
      icon: <Award className="h-5 w-5" />,
      colorClass: 'border-brand-purple text-brand-purple bg-brand-purple/5',
      glowClass: 'shadow-brand-purple/20',
      missions: [
        { id: 'm5_1', name: 'Pressure Control', description: 'Pull triggers to precise depth intervals.', drillId: 'reaction_snap', xpReward: 280, difficulty: 'Advanced' },
        { id: 'm5_2', name: 'Index Rhythm Roll', description: 'Alternate trigger pulling on exact beats.', drillId: 'micro_adjustments', xpReward: 300, difficulty: 'Expert' }
      ]
    },
    {
      id: 6,
      name: 'Blind Warrior Trials',
      description: 'Rely purely on sound and memory. Remove all controller visuals.',
      icon: <Shield className="h-5 w-5" />,
      colorClass: 'border-brand-magenta text-brand-magenta bg-brand-magenta/5',
      glowClass: 'shadow-brand-magenta/20',
      missions: [
        { id: 'm6_1', name: 'Audio Blind Test', description: 'Press buttons based only on vocal cues.', drillId: 'strafe_aim', xpReward: 350, difficulty: 'Expert' },
        { id: 'm6_2', name: 'Simon Sequence Test', description: 'Match expanding sequences with zero screen help.', drillId: 'slide_cancel', xpReward: 400, difficulty: 'Expert' }
      ]
    },
    {
      id: 7,
      name: 'Master Tournament',
      description: 'Prove absolute mechanical controller mastery against elite telemetry presets.',
      icon: <Trophy className="h-5 w-5" />,
      colorClass: 'border-yellow-500 text-yellow-500 bg-yellow-500/5',
      glowClass: 'shadow-yellow-500/20',
      missions: [
        { id: 'm7_1', name: 'Rhythm Sync Apex', description: 'Match rapid scrolling buttons on the beat.', drillId: 'reaction_snap', xpReward: 500, difficulty: 'Expert' },
        { id: 'm7_2', name: 'Grand Master Combat', description: 'Mimic Elden Ring boss parry dodge combos.', drillId: 'slide_cancel', xpReward: 600, difficulty: 'Expert' }
      ]
    }
  ];

  // Load progress
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_campaign_progress');
    if (saved) {
      try {
        setCampaignProgress(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveProgress = (newProg: Record<string, { completed: boolean; stars: number }>) => {
    setCampaignProgress(newProg);
    localStorage.setItem('controller_mastery_campaign_progress', JSON.stringify(newProg));
  };

  // Run simulation timer and animations
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (simStep === 'running' && simTimer > 0) {
      interval = setInterval(() => {
        setSimTimer((prev) => prev - 1);
        
        // Cycle active controller parts to simulate input
        const parts: ('left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers')[] = [
          'left-stick', 'right-stick', 'buttons', 'triggers', 'dpad'
        ];
        const randomPart = parts[Math.floor(Math.random() * parts.length)];
        setActivePart(randomPart);
      }, 800);
    } else if (simTimer === 0 && simStep === 'running') {
      setSimStep('completed');
      setActivePart(null);
    }
    return () => clearInterval(interval);
  }, [simStep, simTimer]);

  const launchMission = (mission: Mission) => {
    setActiveMission(mission);
    setSimStep('running');
    setSimTimer(4);
    triggerHaptic('correct');
  };

  const handlePreset = (tier: 'gold' | 'silver' | 'bronze') => {
    if (tier === 'gold') {
      setMockAcc(96);
      setMockRt(175);
    } else if (tier === 'silver') {
      setMockAcc(86);
      setMockRt(220);
    } else {
      setMockAcc(72);
      setMockRt(270);
    }
  };

  const completeMission = () => {
    if (!activeMission) return;

    // Calculate stars: gold (95%+ acc) = 3, silver (85%+ acc) = 2, bronze = 1
    let stars = 1;
    if (mockAcc >= 95) stars = 3;
    else if (mockAcc >= 85) stars = 2;

    const nextProgress = {
      ...campaignProgress,
      [activeMission.id]: { completed: true, stars }
    };
    saveProgress(nextProgress);

    // Sync XP globally
    logDrillSession(activeMission.drillId, {
      accuracy: mockAcc,
      reactionTime: mockRt,
    });

    // Close simulation
    setActiveMission(null);
    setSimStep('idle');
    triggerHaptic('levelup');
  };

  const isWorldLocked = (worldId: number): boolean => {
    if (worldId === 1) return false;
    // World is locked if previous world's missions are not all completed
    const prevWorld = WORLDS.find(w => w.id === worldId - 1);
    if (!prevWorld) return true;
    return prevWorld.missions.some(m => !campaignProgress[m.id]?.completed);
  };

  const getCompletedMissionsCount = () => {
    return Object.values(campaignProgress).filter(p => p.completed).length;
  };

  const getTotalStarsCount = () => {
    return Object.values(campaignProgress).reduce((sum, p) => sum + p.stars, 0);
  };

  const selectedWorld = WORLDS.find(w => w.id === selectedWorldId) || WORLDS[0];

  return (
    <div className="space-y-6">
      
      {/* Campaign Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* World node progress */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
          <div className="p-3 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-xl">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-zinc-500 font-display">Campaign Progress</span>
            <span className="text-xl font-black text-white font-display">
              {getCompletedMissionsCount()} / 14 Missions
            </span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">
              Across 7 sector worlds
            </span>
          </div>
        </div>

        {/* Stars count */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl">
            <Star className="h-6 w-6 fill-yellow-500" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-zinc-500 font-display">Stars Secured</span>
            <span className="text-xl font-black text-white font-display">
              {getTotalStarsCount()} Stars
            </span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">
              Calibration grade rating
            </span>
          </div>
        </div>

        {/* Campaign unlock level */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
          <div className="p-3 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-zinc-500 font-display">Recruit Class status</span>
            <span className="text-xl font-black text-white font-display">
              {profile.title}
            </span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">
              Rank level {profile.level}
            </span>
          </div>
        </div>
      </section>

      {/* World Map Progression Line */}
      <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 text-left font-display">Campaign Sector Map</h3>
        
        {/* Horizontal scrollable map layout */}
        <div className="flex justify-between items-center gap-4 py-6 overflow-x-auto min-h-[120px] scrollbar-thin">
          {WORLDS.map((world, idx) => {
            const locked = isWorldLocked(world.id);
            const active = selectedWorldId === world.id;
            
            // Check completed status of world
            const completedCount = world.missions.filter(m => campaignProgress[m.id]?.completed).length;
            const isCompleted = completedCount === world.missions.length;

            return (
              <React.Fragment key={world.id}>
                {idx > 0 && (
                  <div className={`h-1 flex-1 min-w-[24px] rounded-full transition-all duration-300 ${
                    locked ? 'bg-zinc-900' : isCompleted ? 'bg-brand-green' : 'bg-brand-purple/40'
                  }`} />
                )}
                <button
                  onClick={() => {
                    if (!locked) {
                      setSelectedWorldId(world.id);
                      triggerHaptic('correct');
                    }
                  }}
                  className={`relative flex-shrink-0 h-16 w-16 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 select-none cursor-pointer ${
                    locked 
                      ? 'border-zinc-900 bg-zinc-950 text-zinc-700 opacity-50 cursor-not-allowed' 
                      : active 
                      ? `scale-110 shadow-lg border-brand-purple text-brand-purple bg-brand-purple/10 ${world.glowClass}`
                      : isCompleted
                      ? 'border-brand-green text-brand-green bg-brand-green/5'
                      : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                  }`}
                  disabled={locked}
                >
                  <span className="text-[10px] font-black font-mono absolute -top-3.5 bg-zinc-950 px-1 rounded border border-zinc-900">
                    W0{world.id}
                  </span>
                  
                  {locked ? (
                    <Lock className="h-4.5 w-4.5" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  ) : (
                    world.icon
                  )}

                  {active && (
                    <span className="absolute -bottom-2 h-1.5 w-1.5 rounded-full bg-brand-purple animate-ping" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* World Details & Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Sector Info */}
        <section className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-brand-purple font-display tracking-widest block">ACTIVE SECTOR SELECTION</span>
            <h2 className="text-base font-black text-white font-display uppercase tracking-wider">
              {selectedWorld.name}
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {selectedWorld.description}
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-semibold">Sector status:</span>
            {isWorldLocked(selectedWorld.id) ? (
              <span className="text-red-400 font-bold uppercase">Locked</span>
            ) : selectedWorld.missions.every(m => campaignProgress[m.id]?.completed) ? (
              <span className="text-brand-green font-bold uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cleared
              </span>
            ) : (
              <span className="text-brand-cyan font-bold uppercase">Active calibration</span>
            )}
          </div>
        </section>

        {/* Missions list */}
        <section className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-display">Tactical Missions</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedWorld.missions.map((mission) => {
              const status = campaignProgress[mission.id];
              const isCleared = status?.completed;

              return (
                <div 
                  key={mission.id}
                  className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-48 relative glass-panel-hover"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        mission.difficulty === 'Beginner' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        mission.difficulty === 'Intermediate' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                        mission.difficulty === 'Advanced' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {mission.difficulty}
                      </span>

                      {/* Stars visual */}
                      {isCleared && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star 
                              key={s} 
                              className={`h-3 w-3 ${s <= (status.stars || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700'}`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white uppercase font-display pt-2">
                      {mission.name}
                    </h4>
                    <p className="text-xs text-zinc-500 leading-normal line-clamp-2">
                      {mission.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-900 pt-3 mt-3">
                    <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider">
                      +{mission.xpReward} XP Reward
                    </span>
                    
                    <button
                      onClick={() => launchMission(mission)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black font-display uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        isCleared
                          ? 'border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                          : 'bg-brand-cyan hover:bg-brand-cyan/90 text-zinc-950 shadow-lg shadow-brand-cyan/10 hover:shadow-brand-cyan/20'
                      }`}
                    >
                      {isCleared ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Replay
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-zinc-950 stroke-zinc-950" />
                          Deploy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Mission Simulation Modal Overlay */}
      {activeMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel border border-brand-purple/20 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30 text-left">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-cyan">Active Campaign Deployment</span>
                <h3 className="text-base font-extrabold text-white font-display uppercase">{activeMission.name}</h3>
              </div>
              {simStep !== 'running' && (
                <button
                  onClick={() => setActiveMission(null)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 bg-zinc-800/40 rounded-lg transition-colors cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
              {simStep === 'running' && (
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full bg-zinc-900 border-2 border-brand-cyan/50 flex items-center justify-center text-white text-3xl font-black font-display animate-pulse shadow-lg shadow-brand-cyan/10">
                    {simTimer}s
                  </div>
                  
                  <div className="w-full max-w-[200px]">
                    <ControllerSvg type={profile.controllerType} activePart={activePart} />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider animate-pulse font-display">
                      INTERCEPTING TELEMETRY COMBAT VECTORS...
                    </span>
                    <p className="text-[9px] text-zinc-500 max-w-xs">
                      Simulating combos, rhythm synchronization, and aim centering curves for training evaluation.
                    </p>
                  </div>
                </div>
              )}

              {simStep === 'completed' && (
                <div className="space-y-6 w-full text-left">
                  <div className="flex items-center gap-3 p-4 bg-brand-green/10 border border-brand-green/20 rounded-2xl">
                    <CheckCircle2 className="h-8 w-8 text-brand-green flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase font-display">Combat Telemetry Log cleared!</h4>
                      <p className="text-[9px] text-zinc-400">Select a performance profile below to simulate stars allocation & XP synchronizations.</p>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-display">Select Mission Performance Preset</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePreset('gold')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                          mockAcc === 96
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-extrabold font-display">GOLD (3★)</span>
                        <span className="text-[9px] font-medium opacity-80">96% Acc / 175ms</span>
                      </button>
                      <button
                        onClick={() => handlePreset('silver')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                          mockAcc === 86
                            ? 'border-zinc-300 bg-zinc-300/10 text-zinc-200'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-extrabold font-display">SILVER (2★)</span>
                        <span className="text-[9px] font-medium opacity-80">86% Acc / 220ms</span>
                      </button>
                      <button
                        onClick={() => handlePreset('bronze')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                          mockAcc === 72
                            ? 'border-amber-700 bg-amber-700/10 text-amber-500'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-extrabold font-display">BRONZE (1★)</span>
                        <span className="text-[9px] font-medium opacity-80">72% Acc / 270ms</span>
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3 pt-3 border-t border-zinc-900">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-zinc-400 font-display uppercase text-[10px]">Aim Accuracy</span>
                        <span className="text-brand-cyan">{mockAcc}%</span>
                      </div>
                      <input
                        type="range" min="60" max="100" value={mockAcc}
                        onChange={(e) => setMockAcc(Number(e.target.value))}
                        className="w-full accent-brand-cyan bg-zinc-900 rounded-lg appearance-none h-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex justify-end gap-2">
              <button
                onClick={() => setActiveMission(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
                disabled={simStep === 'running'}
              >
                Abort
              </button>
              {simStep === 'completed' && (
                <button
                  onClick={completeMission}
                  className="px-5 py-2 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/20 transition-all duration-200 cursor-pointer"
                >
                  Synchronize Mission Cleared (+{activeMission.xpReward} XP)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
