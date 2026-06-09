import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useGamepad } from '../hooks/useGamepad';
import { ControllerView } from './ControllerView';
import type { ButtonKey } from './ControllerView';
import { RotateCcw, ShieldAlert, Award, Play, Swords } from 'lucide-react';

type GameFranchise = 'batman' | 'gtav' | 'rdr2' | 'eldenring' | 'assassins' | 'forza';

interface FranchiseSessionResult {
  date: string;
  game: GameFranchise;
  score: number;
  accuracy: number;
  reactionTime: number; // in ms
}

interface PromptStep {
  instruction: string;
  actionButton?: ButtonKey;
  checkFn: (gamepad: any, mouseInputs?: any) => boolean;
  successFeedback: string;
  duration?: number; // max allowed time for this step in ms
}

export const GameLayoutAcademy: React.FC = () => {
  const { logDrillSession, triggerHaptic } = useApp();
  const gamepad = useGamepad();

  // Configuration
  const [activeGame, setActiveGame] = useState<GameFranchise | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);

  // Play session stats
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [correctHits, setCorrectHits] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  // Game specific state trackers
  const [arkhamCombo, setArkhamCombo] = useState(0);
  const [warningFlash, setWarningFlash] = useState(false);
  const [rdr2DeadEye, setRdr2DeadEye] = useState(false);
  const [weaponWheelOpen, setWeaponWheelOpen] = useState(false);
  const [selectedWeaponSlot, setSelectedWeaponSlot] = useState(0); // 0-7
  const [rdr2RhythmZone, setRdr2RhythmZone] = useState(false);
  const [forzaRPM, setForzaRPM] = useState(1000);
  const [forzaSpeed, setForzaSpeed] = useState(0);

  // Fallback mouse support drag indicators
  const [mouseDragging, setMouseDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // History logs
  const [historyLogs, setHistoryLogs] = useState<FranchiseSessionResult[]>([]);

  // Refs
  const stepStartTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rhythmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load history logs
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_layout_history');
    if (saved) {
      try {
        setHistoryLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse layout history logs', e);
      }
    }
  }, []);

  const saveResult = (result: FranchiseSessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_layout_history', JSON.stringify(nextLogs));
  };

  const getFranchiseLabel = (game: GameFranchise) => {
    switch (game) {
      case 'batman': return 'Batman Arkham Series';
      case 'gtav': return 'Grand Theft Auto V';
      case 'rdr2': return 'Red Dead Redemption 2';
      case 'eldenring': return 'Elden Ring';
      case 'assassins': return 'Assassin\'s Creed';
      case 'forza': return 'Forza Horizon';
    }
  };

  const getFranchiseThemeClass = (game: GameFranchise) => {
    switch (game) {
      case 'batman': return 'border-indigo-600/40 hover:border-indigo-500 bg-slate-950/80';
      case 'gtav': return 'border-emerald-600/40 hover:border-emerald-500 bg-zinc-950/80';
      case 'rdr2': return 'border-red-700/40 hover:border-red-600 bg-stone-950/80';
      case 'eldenring': return 'border-amber-600/40 hover:border-amber-500 bg-amber-950/10';
      case 'assassins': return 'border-zinc-700/40 hover:border-zinc-500 bg-zinc-900/80';
      case 'forza': return 'border-pink-600/40 hover:border-pink-500 bg-neutral-950/80';
    }
  };

  // ----------------------------------------------------
  // GAME STEPS SEQUENCES
  // ----------------------------------------------------
  const getGameSteps = (game: GameFranchise): PromptStep[] => {
    switch (game) {
      case 'batman':
        return [
          {
            instruction: 'Strike standard thug! (Press X)',
            actionButton: 'X',
            checkFn: (gp, mouse) => gp.buttons.X || mouse.X,
            successFeedback: 'CRITICAL STRIKE! Combo x1',
            duration: 4000
          },
          {
            instruction: 'Strike standard thug again! (Press X)',
            actionButton: 'X',
            checkFn: (gp, mouse) => gp.buttons.X || mouse.X,
            successFeedback: 'CRITICAL STRIKE! Combo x2',
            duration: 3000
          },
          {
            instruction: 'WARNING: Thug attacking from behind! COUNTER NOW! (Press Y)',
            actionButton: 'Y',
            checkFn: (gp, mouse) => gp.buttons.Y || mouse.Y,
            successFeedback: 'COUNTER ATTACK! Combo x3',
            duration: 1500
          },
          {
            instruction: 'Shield thug charging! EVADE / Dodge Roll! (Press A)',
            actionButton: 'A',
            checkFn: (gp, mouse) => gp.buttons.A || mouse.A,
            successFeedback: 'EVADED! Combo x4',
            duration: 2500
          },
          {
            instruction: 'Sniper locking in! QUICKFIRE Batarang! (Press LT)',
            actionButton: 'LT',
            checkFn: (gp, mouse) => gp.buttonValues.LT > 0.4 || mouse.LT,
            successFeedback: 'DISARMED! Combo x5',
            duration: 2000
          },
          {
            instruction: 'Secure vantage point! GRAPPLE to ledge! (Press RB)',
            actionButton: 'RB',
            checkFn: (gp, mouse) => gp.buttons.RB || mouse.RB,
            successFeedback: 'VANTAGE ESCAPE!',
            duration: 3500
          }
        ];
      case 'gtav':
        return [
          {
            instruction: 'DRIVING: Accelerate vehicle! (Hold RT above 80%)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => gp.buttonValues.RT > 0.8 || mouse.RT,
            successFeedback: 'ACCELERATING... Speed 60 MPH',
            duration: 4000
          },
          {
            instruction: 'STEERING: Make a sharp left turn! (Deflect Left Stick left > 80%)',
            actionButton: 'LeftStick',
            checkFn: (gp, mouse) => gp.axes[0] < -0.8 || mouse.LS_Left,
            successFeedback: 'DRIFT COMPLETE!',
            duration: 3000
          },
          {
            instruction: 'COMBAT: Aim out window! (Hold LT)',
            actionButton: 'LT',
            checkFn: (gp, mouse) => gp.buttonValues.LT > 0.5 || mouse.LT,
            successFeedback: 'LOCK ON ACQUIRED',
            duration: 3500
          },
          {
            instruction: 'COMBAT: Shoot gangster! (Press RT while aiming)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => (gp.buttonValues.LT > 0.4 && gp.buttonValues.RT > 0.4) || (mouse.LT && mouse.RT),
            successFeedback: 'TARGET NEUTRALIZED',
            duration: 3000
          },
          {
            instruction: 'WEAPON WHEEL: Hold LB to open Weapon Selector (Hold LB)',
            actionButton: 'LB',
            checkFn: (gp, mouse) => gp.buttons.LB || mouse.LB,
            successFeedback: 'WEAPON SELECTOR OPENED',
            duration: 4000
          },
          {
            instruction: 'WEAPON WHEEL: Select SMG Slot (Rotate Right Stick / drag cursor to right)',
            actionButton: 'RightStick',
            checkFn: (gp, mouse) => {
              // SMG is slot 1 (Right/Bottom-Right). Right Stick X > 0.7
              const isSelected = gp.axes[2] > 0.75 || mouse.RS_Right;
              return gp.buttons.LB && isSelected;
            },
            successFeedback: 'SMG EQUIPPED!',
            duration: 4000
          }
        ];
      case 'rdr2':
        return [
          {
            instruction: 'STAMINA RHYTHM: Gallop with horse! (Tap A exactly on green highlight)',
            actionButton: 'A',
            checkFn: (gp, mouse) => {
              // Requires matching RDR2 rhythm zone
              return (gp.buttons.X || gp.buttons.A || mouse.A) && rdr2RhythmZone;
            },
            successFeedback: 'PERFECT GALLOP RHYTHM!',
            duration: 5000
          },
          {
            instruction: 'COMBAT: Aim rifle! (Hold LT)',
            actionButton: 'LT',
            checkFn: (gp, mouse) => gp.buttonValues.LT > 0.5 || mouse.LT,
            successFeedback: 'AIM LOCK ACQUIRED',
            duration: 3500
          },
          {
            instruction: 'DEAD EYE: Activate Dead Eye lock! (Click Right Stick / R3 while aiming)',
            actionButton: 'R3',
            checkFn: (gp, mouse) => {
              const isAiming = gp.buttonValues.LT > 0.4 || mouse.LT;
              const isR3 = gp.buttons.R3 || mouse.R3;
              return isAiming && isR3;
            },
            successFeedback: 'DEAD EYE ACTIVE! Time dilated.',
            duration: 3500
          },
          {
            instruction: 'DEAD EYE: Paint targets and FIRE! (Press RT while aiming)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => gp.buttonValues.RT > 0.5 || mouse.RT,
            successFeedback: 'DEAD EYE SHOTS DISCHARGED!',
            duration: 3000
          },
          {
            instruction: 'INTERACTION: Focus on stranger! (Hold LT)',
            actionButton: 'LT',
            checkFn: (gp, mouse) => gp.buttonValues.LT > 0.5 || mouse.LT,
            successFeedback: 'FOCUS ACTIVE (Greet: X / Antagonize: B)',
            duration: 4000
          },
          {
            instruction: 'INTERACTION: Greet townsfolk politely! (Press X while focusing)',
            actionButton: 'X',
            checkFn: (gp, mouse) => {
              const isFocusing = gp.buttonValues.LT > 0.4 || mouse.LT;
              return isFocusing && (gp.buttons.X || mouse.X);
            },
            successFeedback: '"Good Morning, Mister!" (+5 Honor)',
            duration: 3000
          }
        ];
      case 'eldenring':
        return [
          {
            instruction: 'DODGE ROLL: Evade boss swing sweep! (Press B)',
            actionButton: 'B',
            checkFn: (gp, mouse) => gp.buttons.B || mouse.B,
            successFeedback: 'I-FRAME DODGE! Swept swing evaded.',
            duration: 2000
          },
          {
            instruction: 'BLOCK: Guard target strike! (Hold LB)',
            actionButton: 'LB',
            checkFn: (gp, mouse) => gp.buttons.LB || mouse.LB,
            successFeedback: 'GUARD DEFLECTION. Stamina reduced.',
            duration: 3500
          },
          {
            instruction: 'PARRY: Deflect swing with shield! (Press LT on sweep timing)',
            actionButton: 'LT',
            checkFn: (gp, mouse) => gp.buttonValues.LT > 0.5 || mouse.LT,
            successFeedback: 'CRITICAL SHIELD PARRY! Boss stance broken.',
            duration: 2000
          },
          {
            instruction: 'CRITICAL RIPOSTE: Strike boss chest! (Press RB light attack)',
            actionButton: 'RB',
            checkFn: (gp, mouse) => gp.buttons.RB || mouse.RB,
            successFeedback: 'CRITICAL RIPOSTE HIT! (1240 Damage)',
            duration: 3000
          },
          {
            instruction: 'ATTACK CHAIN: Swing light slash! (Press RB)',
            actionButton: 'RB',
            checkFn: (gp, mouse) => gp.buttons.RB || mouse.RB,
            successFeedback: 'FIRST SLASH CONNECTS',
            duration: 3000
          },
          {
            instruction: 'ATTACK CHAIN: Finish with heavy vertical smash! (Press RT heavy attack)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => gp.buttonValues.RT > 0.5 || mouse.RT,
            successFeedback: 'HEAVY SMASH FINISHER! Boss defeated.',
            duration: 3000
          }
        ];
      case 'assassins':
        return [
          {
            instruction: 'PARKOUR: Free-run rooftop! (Hold RT + A and push LS forward)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => {
              const isSprint = gp.buttonValues.RT > 0.6 || mouse.RT;
              const isJump = gp.buttons.A || mouse.A;
              return isSprint && isJump;
            },
            successFeedback: 'FREE-RUNNING SPRINT...',
            duration: 4000
          },
          {
            instruction: 'STEALTH: Drop crouch into foliage! (Click Left Stick / L3)',
            actionButton: 'L3',
            checkFn: (gp, mouse) => gp.buttons.L3 || mouse.L3,
            successFeedback: 'STEALTH SHADOW COVER',
            duration: 3000
          },
          {
            instruction: 'STEALTH: Execute hidden blade assassination! (Press X near guard)',
            actionButton: 'X',
            checkFn: (gp, mouse) => gp.buttons.X || mouse.X,
            successFeedback: 'SILENT ASSASSINATION COMPLETE',
            duration: 2500
          },
          {
            instruction: 'COMBAT: Strike guard! (Press X)',
            actionButton: 'X',
            checkFn: (gp, mouse) => gp.buttons.X || mouse.X,
            successFeedback: 'GUARD HIT DETECTED',
            duration: 3000
          },
          {
            instruction: 'COMBAT: Parry strike! (Press Y when guard swings)',
            actionButton: 'Y',
            checkFn: (gp, mouse) => gp.buttons.Y || mouse.Y,
            successFeedback: 'DEFLECTED AND DISARMED!',
            duration: 2000
          }
        ];
      case 'forza':
        return [
          {
            instruction: 'LAUNCH CONTROL: Hold brakes! (Hold LT at 100%)',
            actionButton: 'LT',
            checkFn: (gp, mouse) => gp.buttonValues.LT > 0.9 || mouse.LT,
            successFeedback: 'REV BUILDING: 4000 RPM',
            duration: 3000
          },
          {
            instruction: 'LAUNCH CONTROL: Rev throttle! (Hold RT at 100% while holding LT)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => {
              const isLT = gp.buttonValues.LT > 0.8 || mouse.LT;
              const isRT = gp.buttonValues.RT > 0.8 || mouse.RT;
              return isLT && isRT;
            },
            successFeedback: 'BOOST CHARGING: 6500 RPM',
            duration: 3500
          },
          {
            instruction: 'LAUNCH CONTROL: Release brakes and floor throttle! (Release LT, hold RT at 100%)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => {
              const noLT = gp.buttonValues.LT < 0.2 && !mouse.LT;
              const isRT = gp.buttonValues.RT > 0.8 || mouse.RT;
              return noLT && isRT;
            },
            successFeedback: 'PERFECT LAUNCH! Speed 60 MPH',
            duration: 3000
          },
          {
            instruction: 'ACCELERATION: Flat out straightway! (Hold RT at 100%)',
            actionButton: 'RT',
            checkFn: (gp, mouse) => gp.buttonValues.RT > 0.9 || mouse.RT,
            successFeedback: 'GEAR UP! Speed 120 MPH',
            duration: 4000
          },
          {
            instruction: 'STEERING: Steer apex! (Hold Left Stick left at 80% and ease throttle RT to 50%)',
            actionButton: 'LeftStick',
            checkFn: (gp, mouse) => {
              const isSteering = gp.axes[0] < -0.7 || mouse.LS_Left;
              const isThrottle = gp.buttonValues.RT > 0.2 && gp.buttonValues.RT < 0.75;
              return isSteering && (isThrottle || mouse.RT);
            },
            successFeedback: 'APEX CORNER CLEARED!',
            duration: 4000
          }
        ];
    }
  };

  const startFranchiseGame = (game: GameFranchise) => {
    setActiveGame(game);
    setGameState('countdown');
    setCountdown(3);
    setStepIndex(0);
    setScore(0);
    setSpeeds([]);
    setCorrectHits(0);
    setTotalAttempts(0);
    setFeedbackText(null);

    // Reset simulator visual loops
    setArkhamCombo(0);
    setWarningFlash(false);
    setRdr2DeadEye(false);
    setWeaponWheelOpen(false);
    setSelectedWeaponSlot(0);
    setRdr2RhythmZone(false);
    setForzaRPM(1000);
    setForzaSpeed(0);
  };

  // Countdown clock effect
  useEffect(() => {
    let intervalId: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        intervalId = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        setupStep(0);
      }
    }
    return () => clearTimeout(intervalId);
  }, [gameState, countdown]);

  const setupStep = (index: number) => {
    const steps = getGameSteps(activeGame!);
    if (index >= steps.length) {
      handleGameOver();
      return;
    }

    setStepIndex(index);
    setFeedbackText(null);
    stepStartTimeRef.current = performance.now();

    // Trigger visual alarms
    if (activeGame === 'batman' && index === 2) {
      // Counter alarm!
      setWarningFlash(true);
    } else {
      setWarningFlash(false);
    }

    if (activeGame === 'rdr2' && index === 2) {
      setRdr2DeadEye(true);
    } else if (activeGame === 'rdr2' && index !== 3) {
      setRdr2DeadEye(false);
    }

    if (activeGame === 'gtav' && index === 4) {
      setWeaponWheelOpen(true);
    }

    // Horse Stamina Rhythm loop setup
    if (activeGame === 'rdr2' && index === 0) {
      rhythmIntervalRef.current = setInterval(() => {
        setRdr2RhythmZone(true);
        setTimeout(() => setRdr2RhythmZone(false), 800);
      }, 1800);
    } else {
      if (rhythmIntervalRef.current) clearInterval(rhythmIntervalRef.current);
    }

    // Reset loop checks
    if (timerRef.current) clearInterval(timerRef.current);
    
    const stepsData = steps[index];
    const maxTime = stepsData.duration || 4000;

    timerRef.current = setInterval(() => {
      const elapsed = performance.now() - stepStartTimeRef.current;
      
      // Update simulator visuals live
      if (activeGame === 'forza') {
        if (index === 0) {
          setForzaRPM(Math.min(4500, 1000 + (elapsed / maxTime) * 3500));
        } else if (index === 1) {
          setForzaRPM(Math.min(6500, 4000 + (elapsed / maxTime) * 2500));
        } else if (index === 2) {
          setForzaSpeed(Math.min(60, (elapsed / maxTime) * 60));
        } else if (index === 3) {
          setForzaSpeed(Math.min(130, 60 + (elapsed / maxTime) * 70));
        }
      }

      // Check input status
      // We merge physical gamepad status with simulated mouse status
      const mockMouseInputs: any = {};
      if (stepsData.actionButton) {
        // If clicking on virtual controller triggers mockMouseInputs
        mockMouseInputs[stepsData.actionButton] = mouseDragging;
      }
      
      // Also map drag offsets to axes
      if (mouseDragging) {
        mockMouseInputs.LS_Left = dragOffset.x < -40;
        mockMouseInputs.RS_Right = dragOffset.x > 40;
      }

      const isPressed = stepsData.checkFn(gamepad, mockMouseInputs);
      if (isPressed) {
        handleStepSuccess(index, elapsed);
      } else if (elapsed >= maxTime) {
        handleStepTimeout(index);
      }
    }, 30);
  };

  const handleStepSuccess = (index: number, elapsed: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    triggerHaptic('correct');

    const steps = getGameSteps(activeGame!);
    const currentStepData = steps[index];

    setCorrectHits(prev => prev + 1);
    setTotalAttempts(prev => prev + 1);
    setSpeeds(prev => [...prev, Math.round(elapsed)]);
    setFeedbackText(currentStepData.successFeedback);

    // Apply multiplier increments
    if (activeGame === 'batman') {
      setArkhamCombo(prev => prev + 1);
    }

    if (activeGame === 'gtav' && index === 5) {
      setWeaponWheelOpen(false);
    }

    // Short delay and proceed
    setTimeout(() => {
      setupStep(index + 1);
    }, 900);
  };

  const handleStepTimeout = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    triggerHaptic('incorrect');

    setTotalAttempts(prev => prev + 1);
    setFeedbackText('PROMPT TIMEOUT! MISS.');

    if (activeGame === 'batman') {
      setArkhamCombo(0);
    }
    if (activeGame === 'gtav') {
      setWeaponWheelOpen(false);
    }

    // Short delay and proceed
    setTimeout(() => {
      setupStep(index + 1);
    }, 900);
  };

  const handleGameOver = () => {
    setGameState('completed');
    if (timerRef.current) clearInterval(timerRef.current);
    if (rhythmIntervalRef.current) clearInterval(rhythmIntervalRef.current);

    const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0;
    const avgResponse = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

    // Final score scaled
    const finalScore = correctHits * 200 + Math.max(0, 1000 - avgResponse);
    setScore(finalScore);

    const result: FranchiseSessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      game: activeGame!,
      score: finalScore,
      accuracy,
      reactionTime: avgResponse
    };

    saveResult(result);

    // Sync XP
    logDrillSession('strafe_aim', {
      accuracy,
      reactionTime: avgResponse > 0 ? avgResponse : undefined
    });
  };

  // Mouse drag fallback for joysticks
  const handleVirtualStickDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    setMouseDragging(true);
    setDragOffset({
      x: e.clientX - e.currentTarget.getBoundingClientRect().left - 25,
      y: e.clientY - e.currentTarget.getBoundingClientRect().top - 25
    });
  };

  const handleVirtualStickRelease = () => {
    setMouseDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rhythmIntervalRef.current) clearInterval(rhythmIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 text-left">
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Header */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                <Swords className="h-5 w-5 animate-pulse" />
              </span>
              Phase 8: AAA Game Layout Academy
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Calibrate and master controller layouts from the world\'s most popular AAA games. Practice combat counters, weapon wheel sweeps, horse rhythm gallops, and trigger-brake pressure controls in interactive HUD simulations.
            </p>
          </section>

          {/* Franchise Select Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(['batman', 'gtav', 'rdr2', 'eldenring', 'assassins', 'forza'] as GameFranchise[]).map((game) => (
              <div
                key={game}
                className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between space-y-4 h-60 hover:shadow-xl transition-all duration-300 ${getFranchiseThemeClass(game)}`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-black tracking-widest font-display text-zinc-400">
                      AAA Module
                    </span>
                    <span className={`h-2 w-2 rounded-full ${
                      game === 'batman' ? 'bg-indigo-500' :
                      game === 'gtav' ? 'bg-emerald-500' :
                      game === 'rdr2' ? 'bg-red-500' :
                      game === 'eldenring' ? 'bg-amber-500' :
                      game === 'assassins' ? 'bg-zinc-400' : 'bg-pink-500'
                    }`} />
                  </div>
                  <h3 className="text-base font-black uppercase font-display text-white tracking-wide">
                    {getFranchiseLabel(game)}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-normal">
                    {game === 'batman' && 'Arkham Freeflow. Counter warnings (Y), Quickfire Batarangs (LT), and vantage grapples (RB).'}
                    {game === 'gtav' && 'Los Santos Cruising. Drive throttle pressure (RT), aiming locks (LT), and circular Weapon Wheels (LB).'}
                    {game === 'rdr2' && 'Wild West survival. Rhythm horse galloping (A), Dead Eye slow-mo marks (LT+R3), and town greetings (LT+X).'}
                    {game === 'eldenring' && 'Lands Between. I-frame dodge rolls (B), shields blocks (LB), parry sweep triggers (LT), and RIPOSTES (RB).'}
                    {game === 'assassins' && 'Roof sprinting (RT+A), drops crouches (L3), hidden blade slashes (X), and combat deflect parries (Y).'}
                    {game === 'forza' && 'Launch control (LT+RT floor revs), threshold brakes (LT), and corner apex steering (LS left).'}
                  </p>
                </div>
                <button
                  onClick={() => startFranchiseGame(game)}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-white/50 text-zinc-300 hover:text-white text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  Enter Layout Simulator
                </button>
              </div>
            ))}
          </div>

          {/* History calibration logs */}
          {historyLogs.length > 0 && (
            <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                AAA Layout Calibration logs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-bold tracking-wider">
                      <th className="py-2.5">Date</th>
                      <th>Game franchise</th>
                      <th>Accuracy</th>
                      <th>Reaction speed</th>
                      <th>Final score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                    {historyLogs.map((log, index) => (
                      <tr key={index}>
                        <td className="py-3 text-zinc-500">{log.date}</td>
                        <td className="font-bold text-white uppercase font-display text-[10px] tracking-wide">{getFranchiseLabel(log.game)}</td>
                        <td className={log.accuracy >= 90 ? 'text-brand-green' : 'text-zinc-300'}>{log.accuracy}%</td>
                        <td className="font-mono text-zinc-400">{log.reactionTime} ms</td>
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

      {/* Countdown timer */}
      {gameState === 'countdown' && (
        <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <span className="text-xs font-semibold text-brand-cyan uppercase tracking-widest font-display animate-pulse">
            Configuring Game HUD Variables...
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-cyan flex items-center justify-center text-white text-5xl font-black font-display animate-spin shadow-2xl shadow-brand-cyan/5">
            <span className="animate-pulse">{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Module: {getFranchiseLabel(activeGame!).toUpperCase()}
          </p>
        </div>
      )}

      {/* Simulator active */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* HUD Area (Left/8 Columns) */}
          <div className={`lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[500px] relative overflow-hidden transition-all duration-300 ${
            warningFlash ? 'bg-red-950/25 border-red-500 animate-pulse' : ''
          } ${
            rdr2DeadEye ? 'sepia hue-rotate-15 contrast-125 saturate-150' : ''
          }`}>
            
            {/* Top HUD bar matching active franchise styles */}
            <div className="w-full flex items-center justify-between border-b border-zinc-900/60 pb-3 mb-4">
              <span className="text-[10px] font-black font-display text-zinc-400 tracking-wider">
                {activeGame?.toUpperCase()} INTERACTIVE HUD
              </span>
              
              {/* Franchise specific HUD overlays */}
              {activeGame === 'batman' && (
                <div className="px-3 py-1 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 font-bold font-display text-xs animate-bounce">
                  COMBO: x{arkhamCombo}
                </div>
              )}

              {activeGame === 'eldenring' && (
                <div className="flex gap-2">
                  <div className="h-2.5 w-24 bg-zinc-900 border border-red-700 rounded-sm overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: '80%' }} />
                  </div>
                  <div className="h-2.5 w-20 bg-zinc-900 border border-green-700 rounded-sm overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '90%' }} />
                  </div>
                </div>
              )}

              {activeGame === 'rdr2' && (
                <div className="flex gap-2.5 items-center">
                  <span className="text-[8px] font-bold text-zinc-400">HONOR</span>
                  <div className="h-2 w-16 bg-zinc-900 rounded overflow-hidden">
                    <div className="h-full bg-brand-cyan" style={{ width: '70%' }} />
                  </div>
                </div>
              )}

              <span className="text-[10px] font-mono font-bold text-zinc-500">
                PROMPT {stepIndex + 1} / {getGameSteps(activeGame!).length}
              </span>
            </div>

            {/* Instruction prompts */}
            <div className="text-center py-5 bg-zinc-900/40 border border-zinc-900 rounded-2xl relative z-10 space-y-1">
              <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold block font-display">Active Prompt</span>
              <span className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-display px-4 block">
                {getGameSteps(activeGame!)[stepIndex].instruction}
              </span>
              {feedbackText && (
                <span className="text-xs text-brand-cyan uppercase font-bold block animate-pulse">
                  {feedbackText}
                </span>
              )}
            </div>

            {/* Simulated HUD elements visual dashboard */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[260px] relative">
              {/* GTA V Weapon Wheel overlay */}
              {activeGame === 'gtav' && weaponWheelOpen && (
                <div className="absolute inset-0 z-30 bg-zinc-950/80 flex items-center justify-center animate-fade-in">
                  <div className="h-48 w-48 rounded-full border-4 border-zinc-800 relative flex items-center justify-center bg-zinc-900/50">
                    <div className="absolute inset-0 rounded-full border border-dashed border-zinc-700" />
                    
                    {/* Weapon slot sectors */}
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => {
                      const angle = s * 45;
                      const labels = ['Pistol', 'SMG', 'Shotgun', 'Rifle', 'RPG', 'Sniper', 'Grenades', 'Fist'];
                      const active = selectedWeaponSlot === s;
                      return (
                        <div
                          key={s}
                          className={`absolute font-bold text-[8px] uppercase font-display px-2 py-0.5 rounded transition-all duration-150 ${
                            active 
                              ? 'bg-emerald-500 text-zinc-950 border border-emerald-400 scale-110 shadow-[0_0_10px_#10b981]' 
                              : 'text-zinc-500 bg-zinc-900/80 border border-zinc-800'
                          }`}
                          style={{
                            transform: `rotate(${angle}deg) translate(65px) rotate(-${angle}deg)`
                          }}
                        >
                          {labels[s]}
                        </div>
                      );
                    })}
                    <div className="text-[10px] font-bold text-zinc-400 uppercase font-display">WEAPONS</div>
                  </div>
                </div>
              )}

              {/* RDR2 Stamina Gallop rhythm zone */}
              {activeGame === 'rdr2' && stepIndex === 0 && (
                <div className="absolute top-4 flex flex-col items-center gap-1.5 z-20">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-display">Stamina rhythm Calibration</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <div
                        key={item}
                        className={`h-2 w-8 rounded-full transition-colors duration-150 ${
                          rdr2RhythmZone ? 'bg-brand-green shadow-[0_0_6px_#10b981]' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[7px] text-zinc-500 font-mono">TAP A WHEN BAR FLASHES GREEN</span>
                </div>
              )}

              {/* Forza Horizon speed dials */}
              {activeGame === 'forza' && (
                <div className="absolute bottom-4 flex gap-8 z-20 font-mono text-zinc-400">
                  <div className="text-center">
                    <span className="block text-[8px] text-zinc-500 uppercase">Engine RPM</span>
                    <span className="text-xs font-bold text-white">{Math.round(forzaRPM)} RPM</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[8px] text-zinc-500 uppercase">Speed</span>
                    <span className="text-xs font-bold text-brand-cyan">{Math.round(forzaSpeed)} MPH</span>
                  </div>
                </div>
              )}

              {/* General active interactive gamepad drawing */}
              <ControllerView
                hidePanel={true}
                highlightedButton={getGameSteps(activeGame!)[stepIndex].actionButton}
                className="max-w-[320px]"
              />
            </div>

            <div className="w-full text-center border-t border-zinc-900/60 pt-3 text-zinc-500 text-[9px] uppercase font-bold tracking-widest z-10">
              HUD layouts map to standard platform control schemas.
            </div>

          </div>

          {/* Telemetry statistics (Right/4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live stats */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Layout Telemetry HUD
                </h3>
              </div>

              <div className="space-y-6 flex-1">
                {/* Accuracy */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Precision</span>
                  <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 font-display">Taps accuracy</span>
                    <span className="text-xs font-black text-white font-display uppercase">
                      {totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100}%
                    </span>
                  </div>
                </div>

                {/* Speeds log */}
                <div className="space-y-2">
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Reaction time buffer</span>
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1 font-mono text-[9px] max-h-36 overflow-y-auto">
                    {speeds.length === 0 ? (
                      <span className="text-zinc-600 block text-center py-2 uppercase font-sans font-bold text-[8px]">Awaiting inputs</span>
                    ) : (
                      speeds.map((s, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-zinc-900/40">
                          <span className="text-zinc-500">PROMPT {idx + 1}</span>
                          <span className="text-brand-magenta font-bold">{s} ms</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Weapon wheel select demo simulator for mouse click fallback */}
                {!gamepad.connected && activeGame === 'gtav' && stepIndex === 5 && (
                  <div className="space-y-2">
                    <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Analog stick simulator</span>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                      <span className="text-[8px] text-zinc-500 leading-normal block">Drag handle to select right SMG weapon slot:</span>
                      <div 
                        onMouseMove={handleVirtualStickDrag}
                        onMouseLeave={handleVirtualStickRelease}
                        onMouseUp={handleVirtualStickRelease}
                        className="h-14 w-14 rounded-full border border-zinc-800 bg-zinc-950 relative cursor-pointer mx-auto flex items-center justify-center"
                      >
                        <div 
                          className="h-6 w-6 rounded-full bg-brand-cyan absolute shadow shadow-brand-cyan/40"
                          style={{
                            left: `${14 + Math.max(-10, Math.min(10, dragOffset.x / 4))}px`,
                            top: `${14 + Math.max(-10, Math.min(10, dragOffset.y / 4))}px`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="h-4.5 w-4.5 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal font-medium">
                  <strong>Simulations check:</strong> Prompts measure specific timing intervals. Parries and counter moves require quick reflexes.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Completed results screen */}
      {gameState === 'completed' && (
        <div className="glass-panel p-8 rounded-2xl border border-white/5 max-w-2xl mx-auto space-y-6">
          
          <div className="text-center space-y-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan flex items-center justify-center shadow-lg shadow-brand-cyan/5 animate-pulse">
              <Award className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black font-display text-white uppercase tracking-wider">
              AAA Layout calibration complete
            </h2>
            <p className="text-xs text-zinc-500">Layout variables synced to operative file.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Score */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Score</span>
              <span className="text-xl font-black font-display text-brand-cyan text-glow-cyan font-mono block">
                {score}
              </span>
              <span className="block text-[8px] text-zinc-500">PTS secured</span>
            </div>

            {/* Accuracy */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Accuracy</span>
              <span className="text-xl font-black font-display text-white font-mono block">
                {correctHits > 0 ? Math.round((correctHits / totalAttempts) * 100) : 0}%
              </span>
              <span className="block text-[8px] text-zinc-500">precision rate</span>
            </div>

            {/* Reaction Speed */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Reaction time</span>
              <span className="text-xl font-black font-display text-brand-purple block">
                {speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0}ms
              </span>
              <span className="block text-[8px] text-zinc-500">average speed</span>
            </div>

          </div>

          {/* XP Rewards */}
          <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan">
                <Play className="h-5 w-5 fill-brand-cyan" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">XP parameters and layouts logs synced to active profile.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-cyan uppercase tracking-wider font-display">
              +150 XP SECURED
            </span>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => startFranchiseGame(activeGame!)}
              className="px-6 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run Protocol
            </button>
            <button
              onClick={() => {
                setActiveGame(null);
                setGameState('idle');
              }}
              className="px-8 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Back to Academies base
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
