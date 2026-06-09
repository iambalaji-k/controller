import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Clock, Play, CheckCircle2, Flame 
} from 'lucide-react';

interface WorkoutDrill {
  id: string;
  title: string;
  description: string;
  duration: string;
  xpReward: number;
}

export const DailyWorkouts: React.FC = () => {
  const { stats, logDrillSession, triggerHaptic, addToast } = useApp();
  
  const [selectedDuration, setSelectedDuration] = useState<5 | 10 | 15>(5);
  const [workoutState, setWorkoutState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionSpeeds, setSessionSpeeds] = useState<number[]>([]);
  const [sessionAccuracies, setSessionAccuracies] = useState<number[]>([]);

  // Simulation controls
  const [simRunning, setSimRunning] = useState(false);
  const [simAccuracy, setSimAccuracy] = useState(90);

  // Generate personalized workout drills based on weakness calculations
  const generateWorkout = (mins: number): WorkoutDrill[] => {
    const list: WorkoutDrill[] = [];
    
    // Check weaknesses
    const mistakes = stats.buttonMistakes || {};
    const lbMistakes = mistakes['LB'] || 0;
    const ltMistakes = mistakes['LT'] || 0;
    const xMistakes = mistakes['X'] || 0;
    const yMistakes = mistakes['Y'] || 0;

    // Custom queue creation
    if (lbMistakes > 1 || ltMistakes > 1) {
      list.push({ id: 'target_snap', title: 'Bumper Calibration Snap', description: 'Address LB/RB reaction drift by snapping pop-up targets.', duration: '3 min', xpReward: 100 });
      list.push({ id: 'reaction_snap', title: 'Trigger Pressure Reflex', description: 'Calibrate index trigger pull coordinates.', duration: '2 min', xpReward: 120 });
    }

    if (xMistakes > 2 || yMistakes > 2 || list.length < 2) {
      list.push({ id: 'micro_adjustments', title: 'Face Button Flicks', description: 'Address A/B/X/Y latency with high-speed recognition snaps.', duration: '3 min', xpReward: 100 });
    }

    if (stats.accuracy < 80) {
      list.push({ id: 'slow_tracking', title: 'Aim Tracking Centering', description: 'Gently glide thumbsticks back to dead-center zones.', duration: '3 min', xpReward: 120 });
    }

    // Default fallbacks to reach workout counts
    const defaults: WorkoutDrill[] = [
      { id: 'slide_cancel', title: 'Slide-Jump Movement Combos', description: 'Coordinate sprint clicks and crouch aim cancels.', duration: '4 min', xpReward: 150 },
      { id: 'advanced_orbit', title: '360° Circular Traces', description: 'Hone smooth aim loops to maximize assist bubbles.', duration: '5 min', xpReward: 180 },
    ];

    defaults.forEach((def) => {
      const alreadyInList = list.some(d => d.id === def.id);
      if (!alreadyInList) list.push(def);
    });

    const count = mins === 5 ? 2 : mins === 10 ? 3 : 4;
    return list.slice(0, count);
  };

  const activeDrills = generateWorkout(selectedDuration);

  const startWorkout = () => {
    setWorkoutState('running');
    setCurrentStep(0);
    setSessionSpeeds([]);
    setSessionAccuracies([]);
    triggerHaptic('correct');
  };

  const launchStepSimulation = () => {
    setSimRunning(true);
    triggerHaptic('correct');
    
    setTimeout(() => {
      setSimRunning(false);
      
      const newAccs = [...sessionAccuracies, simAccuracy];
      setSessionAccuracies(newAccs);
      
      const newSpeeds = [...sessionSpeeds, 215];
      setSessionSpeeds(newSpeeds);

      // Check if workout complete
      if (currentStep + 1 >= activeDrills.length) {
        setWorkoutState('completed');
        
        // Log final XP session sum
        const finalAccuracy = Math.round(newAccs.reduce((a, b) => a + b, 0) / newAccs.length);
        const finalSpeed = Math.round(newSpeeds.reduce((a, b) => a + b, 0) / newSpeeds.length);
        
        // Log the final drill with bonus XP
        logDrillSession(activeDrills[0].id, {
          accuracy: finalAccuracy,
          reactionTime: finalSpeed,
        });

        addToast({
          type: 'achievement',
          title: 'WORKOUT COMPLETED!',
          message: `Daily workout finished! (+150 XP Streak Bonus Added)`,
          icon: 'Flame'
        });
        triggerHaptic('achievement');
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }, 2000);
  };

  const activeDrill = activeDrills[currentStep];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 text-left relative overflow-hidden">
      
      {workoutState === 'idle' && (
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                Personalized Daily Workouts
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Generates a quick custom workout queue addressing your slowest reaction times.
              </p>
            </div>
            
            <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
              {([5, 10, 15] as const).map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSelectedDuration(mins)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black font-display uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedDuration === mins
                      ? 'bg-brand-purple text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mins} MIN
                </button>
              ))}
            </div>
          </div>

          {/* Drills Queue list preview */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-display block">Workout Program Queue</span>
            
            <div className="space-y-2">
              {activeDrills.map((drill, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 flex justify-between items-center gap-4"
                >
                  <div>
                    <h4 className="text-xs font-black text-white uppercase font-display flex items-center gap-1.5">
                      <span className="text-brand-purple">{idx + 1}.</span>
                      {drill.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">{drill.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-xs font-bold text-brand-cyan font-mono">{drill.duration}</span>
                    <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-wider font-display">+{drill.xpReward} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startWorkout}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-brand-purple text-white text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-red-500/10 hover:shadow-red-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-white" />
            Initialize Workout Routine
          </button>
        </div>
      )}

      {workoutState === 'running' && activeDrill && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <span className="text-xs font-bold text-zinc-400 font-display uppercase tracking-wider">Workout In Progress</span>
            <span className="text-xs font-bold text-brand-purple font-mono">Step {currentStep + 1} of {activeDrills.length}</span>
          </div>

          {/* Drill info box */}
          <div className="p-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl text-center space-y-4">
            <Clock className="h-10 w-10 text-brand-cyan animate-pulse mx-auto" />
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-cyan tracking-wider font-display block">Active Exercise</span>
              <h3 className="text-base font-black text-white font-display uppercase">{activeDrill.title}</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">{activeDrill.description}</p>
            </div>

            {simRunning ? (
              <div className="py-4 space-y-2">
                <div className="h-8 w-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin mx-auto" />
                <span className="text-[9px] font-bold text-brand-purple uppercase tracking-widest block font-display animate-pulse">Running Calibration...</span>
              </div>
            ) : (
              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                <div className="space-y-1.5 text-left w-full max-w-xs mx-auto">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase font-display">
                    <span>Select Performance Accuracy</span>
                    <span className="text-brand-purple">{simAccuracy}%</span>
                  </div>
                  <input 
                    type="range" min="70" max="100" value={simAccuracy}
                    onChange={(e) => setSimAccuracy(Number(e.target.value))}
                    className="w-full accent-brand-purple bg-zinc-950 rounded-lg appearance-none h-1.5"
                  />
                </div>
                <button
                  onClick={launchStepSimulation}
                  className="px-6 py-3 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-cyan/10"
                >
                  <Play className="h-4 w-4 fill-zinc-950" />
                  Calibrate Step
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {workoutState === 'completed' && (
        <div className="py-8 text-center max-w-md mx-auto space-y-6">
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center text-brand-green">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-white font-display uppercase tracking-wider mt-4">Workout Completed!</h3>
            <p className="text-xs text-zinc-500 mt-1">XP synchronized. Muscle memory indexes updated.</p>
          </div>

          <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-2xl flex items-center gap-3 text-left">
            <Flame className="h-8 w-8 text-red-500 animate-pulse flex-shrink-0" />
            <div>
              <span className="block text-[9px] uppercase font-bold text-zinc-500 font-display">XP Reward Gained</span>
              <span className="text-base font-black text-white font-display">+150 XP Daily Workout Streak Bonus</span>
            </div>
          </div>

          <button
            onClick={() => {
              setWorkoutState('idle');
              setCurrentStep(0);
            }}
            className="w-full py-3.5 border border-zinc-850 bg-zinc-900/20 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider rounded-xl hover:bg-zinc-900/50 transition-all cursor-pointer"
          >
            Exit Daily Workout
          </button>
        </div>
      )}

    </div>
  );
};
