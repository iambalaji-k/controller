import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useGamepad } from '../hooks/useGamepad';
import { RotateCcw, Target, ShieldAlert, Award, Activity, Compass, Zap, HelpCircle } from 'lucide-react';

type AcademyGame = 'tracking' | 'maze' | 'circle' | 'aim';
type ActiveStick = 'left' | 'right';

interface StickSessionResult {
  date: string;
  game: AcademyGame;
  stick: ActiveStick;
  precision: number; // %
  stability: number; // %
  timeTaken: number; // ms
  score: number;
}

export const AnalogStickAcademy: React.FC = () => {
  const { logDrillSession, triggerHaptic } = useApp();
  const gamepad = useGamepad();

  // Settings
  const [activeGame, setActiveGame] = useState<AcademyGame | null>(null);
  const [selectedStick, setSelectedStick] = useState<ActiveStick>('right');
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);

  // Calibration metrics
  const [precision, setPrecision] = useState(100);
  const [stability, setStability] = useState(100);
  const [elapsedTime, setElapsedTime] = useState(0); // in ms
  const [score, setScore] = useState(0);

  // History logs
  const [historyLogs, setHistoryLogs] = useState<StickSessionResult[]>([]);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // In-game mechanics refs
  const stickPosRef = useRef({ x: 0, y: 0 }); // Current coordinates [-1, 1]
  const gameTimeRef = useRef(0); // in ms
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);

  // 1. Target Tracking variables
  const accumulatedPrecisionRef = useRef(0);
  const accumulatedStabilityRef = useRef(0);
  const trackingCountRef = useRef(0);
  const lastRawStickRef = useRef({ x: 0, y: 0 });

  // 2. Precision Maze variables
  const mazeProgressRef = useRef(0); // 0 to 1
  const mazeCollisionsRef = useRef(0);

  // 3. Circle Tracing variables
  const circleAngleRef = useRef(0); // 0 to 2*PI
  const circleLapCountRef = useRef(0);
  const circleLastAngleRef = useRef(0);
  const circleAngularCoverageRef = useRef(0); // total traversed angle

  // 4. Smooth Aim Trainer variables
  const aimTargetRef = useRef({ x: 250, y: 175 });
  const aimTargetsClearedRef = useRef(0);
  const aimLockProgressRef = useRef(0); // 0 to 100%
  const aimTargetsTotal = 6;

  // Load history logs
  useEffect(() => {
    const saved = localStorage.getItem('controller_mastery_stick_history');
    if (saved) {
      try {
        setHistoryLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse stick history', e);
      }
    }
  }, []);

  const saveResult = (result: StickSessionResult) => {
    const nextLogs = [result, ...historyLogs.slice(0, 19)];
    setHistoryLogs(nextLogs);
    localStorage.setItem('controller_mastery_stick_history', JSON.stringify(nextLogs));
  };

  const getGameLabel = (game: AcademyGame) => {
    switch (game) {
      case 'tracking': return 'Target Tracking';
      case 'maze': return 'Precision Maze';
      case 'circle': return 'Circle Tracing';
      case 'aim': return 'Smooth Aim Trainer';
    }
  };

  // Launch the game
  const startGame = (game: AcademyGame) => {
    setActiveGame(game);
    setGameState('countdown');
    setCountdown(3);
    setPrecision(100);
    setStability(100);
    setElapsedTime(0);
    setScore(0);

    // Reset loop trackers
    stickPosRef.current = { x: 0, y: 0 };
    gameTimeRef.current = 0;
    frameCountRef.current = 0;
    accumulatedPrecisionRef.current = 0;
    accumulatedStabilityRef.current = 0;
    trackingCountRef.current = 0;
    lastRawStickRef.current = { x: 0, y: 0 };

    // Game specific resets
    mazeProgressRef.current = 0;
    mazeCollisionsRef.current = 0;
    circleAngleRef.current = 0;
    circleLapCountRef.current = 0;
    circleLastAngleRef.current = 0;
    circleAngularCoverageRef.current = 0;
    
    // Smooth Aim resets
    aimTargetsClearedRef.current = 0;
    aimLockProgressRef.current = 0;
    aimTargetRef.current = getRandomAimPosition();
  };

  const getRandomAimPosition = () => {
    // Canvas bounds 500x350
    const margin = 60;
    return {
      x: margin + Math.random() * (500 - margin * 2),
      y: margin + Math.random() * (350 - margin * 2)
    };
  };

  // Countdown timer effect
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (gameState === 'countdown') {
      if (countdown > 0) {
        timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        setGameState('playing');
        lastTimeRef.current = performance.now();
        animFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    }
    return () => clearTimeout(timerId);
  }, [gameState, countdown]);

  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Mouse fallback handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || gamepad.connected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse coordinate relative to canvas center [-1, 1]
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const stickX = (mouseX - cx) / (cx - 20);
    const stickY = (mouseY - cy) / (cy - 20);

    stickPosRef.current = {
      x: Math.max(-1, Math.min(1, stickX)),
      y: Math.max(-1, Math.min(1, stickY))
    };
  };

  // Main game tick loop
  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    gameTimeRef.current += dt;
    setElapsedTime(Math.round(gameTimeRef.current));

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Capture Input Coordinates
    let stickX = stickPosRef.current.x;
    let stickY = stickPosRef.current.y;

    if (gamepad.connected) {
      // Pull axes
      const xIdx = selectedStick === 'left' ? 0 : 2;
      const yIdx = selectedStick === 'left' ? 1 : 3;
      // Apply deadzone check
      let rawX = gamepad.axes[xIdx] || 0;
      let rawY = gamepad.axes[yIdx] || 0;
      if (Math.abs(rawX) < 0.08) rawX = 0;
      if (Math.abs(rawY) < 0.08) rawY = 0;
      stickX = rawX;
      stickY = rawY;
      stickPosRef.current = { x: rawX, y: rawY };
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Map stick positions to canvas dimensions
    const cursorX = cx + stickX * (cx - 30);
    const cursorY = cy + stickY * (cy - 30);

    // 2. Measure Stability (frame-to-frame change variance)
    const jitterX = stickX - lastRawStickRef.current.x;
    const jitterY = stickY - lastRawStickRef.current.y;
    const jitter = Math.sqrt(jitterX * jitterX + jitterY * jitterY);
    // Stability scales relative to jitter index
    const frameStability = Math.max(0, 100 - jitter * 800);
    accumulatedStabilityRef.current += frameStability;
    lastRawStickRef.current = { x: stickX, y: stickY };

    // 3. Render Game-Specific elements
    if (activeGame === 'tracking') {
      renderTargetTracking(ctx, canvas, cursorX, cursorY);
    } else if (activeGame === 'maze') {
      renderPrecisionMaze(ctx, canvas, cursorX, cursorY);
    } else if (activeGame === 'circle') {
      renderCircleTracing(ctx, canvas, stickX, stickY);
    } else if (activeGame === 'aim') {
      renderAimTrainer(ctx, canvas, cursorX, cursorY, dt);
    }

    // 4. Draw Stick Grid helper
    drawStickGrid(ctx, canvas);

    // 5. Draw Target Cursor
    drawAimCursor(ctx, cursorX, cursorY);

    // Update frame counter
    frameCountRef.current++;
    trackingCountRef.current++;

    // Rolling analytics state updates
    const finalPrecision = Math.round(accumulatedPrecisionRef.current / trackingCountRef.current);
    const finalStability = Math.round(accumulatedStabilityRef.current / trackingCountRef.current);
    setPrecision(Math.max(1, Math.min(100, finalPrecision)));
    setStability(Math.max(1, Math.min(100, finalStability)));

    // Request next frame
    animFrameIdRef.current = requestAnimationFrame(gameLoop);
  };

  // Drawing helpers
  const drawStickGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    
    // Draw crosshair axes
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(canvas.width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, canvas.height);
    ctx.stroke();

    // Draw bounds circle
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 30, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawAimCursor = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;

    // Crosshair rings
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair lines
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 14);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  // MINI GAME 1: Target Tracking
  const renderTargetTracking = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    cxCursor: number, 
    cyCursor: number
  ) => {
    // Target position updates smoothly over time
    const speedMultiplier = 0.0012;
    const t = gameTimeRef.current * speedMultiplier;
    
    // Winding Lissajous curve aiming
    const rx = canvas.width / 2 - 60;
    const ry = canvas.height / 2 - 50;
    const targetX = canvas.width / 2 + Math.cos(t * 1.5) * rx;
    const targetY = canvas.height / 2 + Math.sin(t * 1.1) * ry;

    // Draw Target Rings
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#8b5cf6';
    
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Distance calculation
    const dx = cxCursor - targetX;
    const dy = cyCursor - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Track precision ratio
    const maxDistance = 140;
    const framePrecision = Math.max(0, 100 - (dist / maxDistance) * 100);
    accumulatedPrecisionRef.current += framePrecision;

    // If game timer exceeds 20 seconds, training completes
    if (gameTimeRef.current >= 15000) {
      handleGameOver(finalScore('tracking'));
    }
  };

  // MINI GAME 2: Precision Maze
  const renderPrecisionMaze = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    cxCursor: number, 
    cyCursor: number
  ) => {
    // Draw Winding Winding Road Path
    // Path center nodes
    const p0 = { x: 50, y: 175 };
    const p1 = { x: 160, y: 80 };
    const p2 = { x: 250, y: 270 };
    const p3 = { x: 340, y: 80 };
    const p4 = { x: 450, y: 175 };

    const pathWidth = 46;

    // Render path boundary
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.08)';
    ctx.lineWidth = pathWidth + 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 0, 127, 0.2)';
    ctx.lineWidth = pathWidth;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.stroke();

    // Draw checkpoints
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 8, 0, Math.PI * 2); // Start
    ctx.arc(p4.x, p4.y, 8, 0, Math.PI * 2); // Finish
    ctx.fill();

    // Start / Finish Text labels
    ctx.fillStyle = '#fff';
    ctx.font = '8px var(--font-display)';
    ctx.fillText('START', p0.x - 15, p0.y - 15);
    ctx.fillText('FINISH', p4.x - 15, p4.y - 15);

    // Collision detection: find closest point on segment to cursor
    const getDistanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return { dist: Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay)), t: 0 };
      
      let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = ax + t * dx;
      const projY = ay + t * dy;
      return {
        dist: Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY)),
        t
      };
    };

    // Find closest segment distance
    const segs = [
      getDistanceToSegment(cxCursor, cyCursor, p0.x, p0.y, p1.x, p1.y),
      getDistanceToSegment(cxCursor, cyCursor, p1.x, p1.y, p2.x, p2.y),
      getDistanceToSegment(cxCursor, cyCursor, p2.x, p2.y, p3.x, p3.y),
      getDistanceToSegment(cxCursor, cyCursor, p3.x, p3.y, p4.x, p4.y)
    ];

    segs.sort((a, b) => a.dist - b.dist);
    const closest = segs[0];

    // Check bounds
    const isOut = closest.dist > pathWidth / 2;
    if (isOut) {
      // Wall collision!
      ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      mazeCollisionsRef.current += 1;
      triggerHaptic('incorrect');
    }

    // Progress estimation based on segments traversed
    const segmentIndex = segs.indexOf(closest);
    const progress = (segmentIndex + closest.t) / segs.length;
    if (progress > mazeProgressRef.current) {
      mazeProgressRef.current = progress;
    }

    // Precision is inverse of wall collision rates
    const framePrecision = Math.max(1, 100 - (mazeCollisionsRef.current * 0.8));
    accumulatedPrecisionRef.current += framePrecision;

    // Check completion Finish threshold
    const distToFinish = Math.sqrt((cxCursor - p4.x) * (cxCursor - p4.x) + (cyCursor - p4.y) * (cyCursor - p4.y));
    if (distToFinish < 20 && mazeProgressRef.current > 0.85) {
      handleGameOver(finalScore('maze'));
    }
  };

  // MINI GAME 3: Circle Tracing
  const renderCircleTracing = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    stickX: number,
    stickY: number
  ) => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 110;

    // Draw dotted circle track
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Inner targets
    ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius - 15, 0, Math.PI * 2);
    ctx.stroke();

    // Draw starting notch at top (0 angle)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - 12);
    ctx.lineTo(cx, cy - radius + 12);
    ctx.stroke();

    // Determine current stick polar angles & magnitude
    const magnitude = Math.sqrt(stickX * stickX + stickY * stickY);
    const angle = Math.atan2(stickY, stickX); // ranges from -PI to PI

    // Calculate precision: matches target polar radius (0.75 magnitude)
    const targetMag = 0.75;
    const magError = Math.abs(magnitude - targetMag);
    const framePrecision = Math.max(0, 100 - magError * 180);
    
    // Only register tracking if stick is deflected past a baseline deadzone
    if (magnitude > 0.2) {
      accumulatedPrecisionRef.current += framePrecision;
      
      // Calculate angular delta traverse
      let deltaAngle = angle - circleLastAngleRef.current;
      // Handle jump at -PI to PI boundaries
      if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      circleAngularCoverageRef.current += Math.abs(deltaAngle);
      circleLastAngleRef.current = angle;

      // Check lap count: 2 * PI angle = 1 full lap. Goal: 3 laps.
      const laps = Math.min(3, circleAngularCoverageRef.current / (Math.PI * 2));
      circleLapCountRef.current = laps;

      if (laps >= 3) {
        handleGameOver(finalScore('circle'));
      }
    } else {
      accumulatedPrecisionRef.current += 100; // neutral stick resets target error
    }

    // Render progress bar inside canvas
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(50, canvas.height - 25, canvas.width - 100, 8);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(50, canvas.height - 25, (canvas.width - 100) * (circleLapCountRef.current / 3), 8);
    
    ctx.fillStyle = '#fff';
    ctx.font = '8px var(--font-display)';
    ctx.fillText(`TRACING LAP PROGRESS: ${Math.round((circleLapCountRef.current / 3) * 100)}%`, 50, canvas.height - 32);
  };

  // MINI GAME 4: Smooth Aim Trainer
  const renderAimTrainer = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    cxCursor: number, 
    cyCursor: number,
    dt: number
  ) => {
    const target = aimTargetRef.current;

    // Draw Target Ring
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#eab308';
    
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Target fill
    ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Target bullseye dot
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Check cursor alignment
    const dx = cxCursor - target.x;
    const dy = cyCursor - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const isInside = dist < 22;

    if (isInside) {
      // Locking timer fills up: takes 400ms to lock
      aimLockProgressRef.current += (dt / 400) * 100;
      ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 24, 0, (Math.PI * 2) * (Math.min(100, aimLockProgressRef.current) / 100));
      ctx.stroke();

      if (aimLockProgressRef.current >= 100) {
        // Target Locked & Cleared!
        aimTargetsClearedRef.current += 1;
        aimLockProgressRef.current = 0;
        triggerHaptic('correct');
        
        if (aimTargetsClearedRef.current >= aimTargetsTotal) {
          handleGameOver(finalScore('aim'));
        } else {
          aimTargetRef.current = getRandomAimPosition();
        }
      }
    } else {
      // Decay locking progress if aim slips away
      aimLockProgressRef.current = Math.max(0, aimLockProgressRef.current - (dt / 150) * 100);
    }

    // Precision calculation: inverse distance
    const maxAimDistance = 250;
    const framePrecision = Math.max(0, 100 - (dist / maxAimDistance) * 100);
    accumulatedPrecisionRef.current += framePrecision;

    // Target text HUD
    ctx.fillStyle = '#fff';
    ctx.font = '8px var(--font-display)';
    ctx.fillText(`TARGETS LOCKED: ${aimTargetsClearedRef.current} / ${aimTargetsTotal}`, 50, canvas.height - 20);
  };

  const finalScore = (gameType: AcademyGame) => {
    const pVal = accumulatedPrecisionRef.current / trackingCountRef.current;
    const sVal = accumulatedStabilityRef.current / trackingCountRef.current;
    const tVal = gameTimeRef.current;

    // Score formulas:
    // Precision & Stability high, Time low
    if (gameType === 'tracking') {
      return Math.round((pVal * 40 + sVal * 40) * 1.5);
    }
    if (gameType === 'maze') {
      const speedFactor = Math.max(1, 100 - (tVal / 200));
      return Math.round((pVal * 60 + sVal * 15) * speedFactor * 0.1);
    }
    if (gameType === 'circle') {
      const speedFactor = Math.max(1, 120 - (tVal / 180));
      return Math.round((pVal * 50 + sVal * 30) * speedFactor * 0.1);
    }
    // Aim
    const speedFactor = Math.max(1, 150 - (tVal / 150));
    return Math.round((pVal * 50 + sVal * 20) * speedFactor * 0.1);
  };

  const handleGameOver = (finalScoreVal: number) => {
    setGameState('completed');
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    const avgPrecision = Math.round(accumulatedPrecisionRef.current / trackingCountRef.current);
    const avgStability = Math.round(accumulatedStabilityRef.current / trackingCountRef.current);

    const result: StickSessionResult = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      game: activeGame!,
      stick: selectedStick,
      precision: Math.max(1, Math.min(100, avgPrecision)),
      stability: Math.max(1, Math.min(100, avgStability)),
      timeTaken: Math.round(gameTimeRef.current),
      score: finalScoreVal
    };

    saveResult(result);

    // Sync XP
    logDrillSession(selectedStick === 'left' ? 'slow_tracking' : 'target_snap', {
      accuracy: result.precision,
      reactionTime: Math.round(result.timeTaken / 10)
    });
  };

  return (
    <div className="space-y-6 text-left">
      
      {gameState === 'idle' && (
        <div className="space-y-6">
          {/* Header intro */}
          <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                <Compass className="h-5 w-5 animate-spin-slow" />
              </span>
              Phase 7: Analog Stick Academy
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              Calibrate exact thumbstick dynamics. These routines evaluate coordinate grids, tracking accuracy, circular sweeping patterns, and target locks. Toggle between Left Stick (Movement calibration) and Right Stick (Aim vector calibration).
            </p>
          </section>

          {/* Stick Select & Settings */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Target Calibration Stick</span>
              <div className="flex gap-2">
                {(['left', 'right'] as ActiveStick[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStick(st)}
                    className={`py-2 px-6 rounded-xl border text-center transition-all duration-200 uppercase font-bold font-display text-xs cursor-pointer ${
                      selectedStick === st
                        ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {st === 'left' ? 'Left Stick (LS)' : 'Right Stick (RS)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-brand-cyan flex-shrink-0" />
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                <strong>Mouse Fallback:</strong> If no physical gamepad is connected, dragging or moving the cursor across the canvas simulates stick deflections.
              </p>
            </div>
          </div>

          {/* Mini-game selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Target Tracking */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-cyan/40 hover:shadow-lg transition-all duration-300">
              <div className="space-y-1">
                <div className="p-2.5 w-10 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold uppercase font-display text-white tracking-wide pt-2">
                  Target Tracking
                </h3>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Lock onto a smoothly moving target along a winding Lissajous curve. Measures precision and stick stability over 15s.
                </p>
              </div>
              <button
                onClick={() => startGame('tracking')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 text-zinc-300 hover:text-brand-cyan text-[10px] font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Launch Tracking
              </button>
            </div>

            {/* Precision Maze */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-magenta/40 hover:shadow-lg transition-all duration-300">
              <div className="space-y-1">
                <div className="p-2.5 w-10 rounded-lg bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/20">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold uppercase font-display text-white tracking-wide pt-2">
                  Precision Maze
                </h3>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Guide a pointer from Start to Finish within narrow winding corridors. Incurs score penalties for touching borders.
                </p>
              </div>
              <button
                onClick={() => startGame('maze')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-magenta/50 hover:bg-brand-magenta/5 text-zinc-300 hover:text-brand-magenta text-[10px] font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Launch Maze
              </button>
            </div>

            {/* Circle Tracing */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-brand-purple/40 hover:shadow-lg transition-all duration-300">
              <div className="space-y-1">
                <div className="p-2.5 w-10 rounded-lg bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold uppercase font-display text-white tracking-wide pt-2">
                  Circle Tracing
                </h3>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Perform circular rotations at 0.75 magnitude to trace 3 complete loops. Tracks radius stability and speed consistency.
                </p>
              </div>
              <button
                onClick={() => startGame('circle')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-brand-purple/50 hover:bg-brand-purple/5 text-zinc-300 hover:text-brand-purple text-[10px] font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Launch Tracing
              </button>
            </div>

            {/* Smooth Aim Trainer */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-yellow-500/40 hover:shadow-lg transition-all duration-300">
              <div className="space-y-1">
                <div className="p-2.5 w-10 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold uppercase font-display text-white tracking-wide pt-2">
                  Smooth Aim Trainer
                </h3>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Acquire random targets and maintain stable hover locks for 400ms. Complete 6 locks as fast as possible.
                </p>
              </div>
              <button
                onClick={() => startGame('aim')}
                className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 hover:bg-yellow-500/5 text-zinc-300 hover:text-yellow-500 text-[10px] font-bold font-display uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Launch Aim Lab
              </button>
            </div>

          </div>

          {/* History logs */}
          {historyLogs.length > 0 && (
            <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                Stick Academy calibration history
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-bold tracking-wider">
                      <th className="py-2.5">Date</th>
                      <th>Academy Drill</th>
                      <th>Stick Type</th>
                      <th>Precision</th>
                      <th>Stability</th>
                      <th>Duration</th>
                      <th>Calibration Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium text-zinc-300">
                    {historyLogs.map((log, index) => (
                      <tr key={index}>
                        <td className="py-3 text-zinc-500">{log.date}</td>
                        <td className="font-bold text-white uppercase font-display text-[10px] tracking-wide">{getGameLabel(log.game)}</td>
                        <td className="uppercase font-semibold text-zinc-400 text-[9px]">{log.stick === 'left' ? 'Left Stick (LS)' : 'Right Stick (RS)'}</td>
                        <td className={log.precision >= 90 ? 'text-brand-green' : 'text-zinc-300'}>{log.precision}%</td>
                        <td className="text-brand-purple font-semibold">{log.stability}%</td>
                        <td className="font-mono">{(log.timeTaken / 1000).toFixed(2)}s</td>
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
            Configuring Vector Coordinates...
          </span>
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-brand-cyan flex items-center justify-center text-white text-5xl font-black font-display animate-spin shadow-2xl shadow-brand-cyan/5">
            <span className="animate-pulse">{countdown}</span>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-wide">
            Drill: {getGameLabel(activeGame!).toUpperCase()} | Calibration: {selectedStick === 'left' ? 'LEFT STICK (LS)' : 'RIGHT STICK (RS)'}
          </p>
        </div>
      )}

      {/* Playing game */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Canvas arena (Left/8 Columns) */}
          <div className="lg:col-span-8 glass-panel p-4 rounded-2xl border border-white/5 flex flex-col justify-between items-center min-h-[500px]">
            
            {/* Header telemetry HUD */}
            <div className="w-full flex items-center justify-between border-b border-zinc-900 pb-3 mb-3">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-display">
                Calibrating: <span className="text-white">{selectedStick === 'left' ? 'LEFT STICK (LS)' : 'RIGHT STICK (RS)'}</span>
              </span>

              <div className="flex gap-4 text-[10px] font-bold font-display uppercase tracking-wider items-center">
                <span className="text-brand-purple">Drill: {getGameLabel(activeGame!)}</span>
                <span className="text-brand-cyan">Timer: {(elapsedTime / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Interactive Canvas */}
            <div className="relative w-full max-w-[500px] border border-zinc-900/80 bg-zinc-950/60 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={500}
                height={350}
                onMouseMove={handleMouseMove}
                className="w-full h-auto block cursor-none"
              />
            </div>

            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center pt-2">
              Move physical gamepad stick to steer the cyber crosshair.
            </span>

          </div>

          {/* Sidebar metrics analytics */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Telemetry log */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between space-y-4 text-left">
              <div className="border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                  Vector Calibration HUD
                </h3>
              </div>

              <div className="space-y-6 flex-1">
                {/* Precision bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold font-display uppercase tracking-wider">
                    <span className="text-zinc-500">Coordinate Precision</span>
                    <span className="text-brand-cyan">{precision}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan transition-all duration-75" style={{ width: `${precision}%` }} />
                  </div>
                </div>

                {/* Stability bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold font-display uppercase tracking-wider">
                    <span className="text-zinc-500">Deflection Stability</span>
                    <span className="text-brand-purple">{stability}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-purple transition-all duration-75" style={{ width: `${stability}%` }} />
                  </div>
                </div>

                {/* Live Stick deflect state display */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Stick Deflection Matrix</span>
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1 text-[10px] font-mono leading-normal text-zinc-400">
                    <div>Deflection X: {stickPosRef.current.x.toFixed(3)}</div>
                    <div>Deflection Y: {stickPosRef.current.y.toFixed(3)}</div>
                    <div>Deflection Mag: {Math.sqrt(stickPosRef.current.x * stickPosRef.current.x + stickPosRef.current.y * stickPosRef.current.y).toFixed(3)}</div>
                  </div>
                </div>

              </div>

              <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="h-4.5 w-4.5 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-zinc-500 leading-normal font-medium">
                  <strong>Academy Rule:</strong> Maintain smooth, continuous vector sweeps. Jerky or erratic stick movements lower stability ratings.
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
              Vector calibration complete
            </h2>
            <p className="text-xs text-zinc-500">Operative profile registers and aim curve variables updated.</p>
          </div>

          {/* Results Summary Dashboard */}
          <div className="grid grid-cols-4 gap-3">
            
            {/* Calibration score */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Score</span>
              <span className="text-xl font-black font-display text-brand-cyan text-glow-cyan font-mono block">
                {score}
              </span>
              <span className="block text-[8px] text-zinc-500">PTS secured</span>
            </div>

            {/* Precision */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Precision</span>
              <span className="text-xl font-black font-display text-white font-mono block">
                {precision}%
              </span>
              <span className="block text-[8px] text-zinc-500">accuracy rate</span>
            </div>

            {/* Stability */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Stability</span>
              <span className="text-xl font-black font-display text-brand-purple block">
                {stability}%
              </span>
              <span className="block text-[8px] text-zinc-500">smooth rating</span>
            </div>

            {/* Duration */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-1">
              <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-500 font-display">Time Taken</span>
              <span className="text-xl font-black font-display text-brand-magenta font-mono block">
                {(elapsedTime / 1000).toFixed(2)}s
              </span>
              <span className="block text-[8px] text-zinc-500">duration</span>
            </div>

          </div>

          {/* XP Rewards */}
          <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan">
                <Activity className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">Calibration Reward Claims</h4>
                <p className="text-[9px] text-zinc-400">XP parameters and target statistics synced to active profile.</p>
              </div>
            </div>
            <span className="text-xs font-black text-brand-cyan uppercase tracking-wider font-display">
              +150 XP SECURED
            </span>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => startGame(activeGame!)}
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
              Back to Academy base
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
