import React, { useState, useEffect, useRef } from 'react';
import { useGamepad } from '../hooks/useGamepad';
import { Activity, Gamepad2, Info } from 'lucide-react';
import { audioFeedback } from '../utils/audio';

export type ButtonKey = 
  | 'A' | 'B' | 'X' | 'Y' 
  | 'LB' | 'RB' | 'LT' | 'RT' 
  | 'DpadUp' | 'DpadDown' | 'DpadLeft' | 'DpadRight'
  | 'LeftStick' | 'L3' | 'RightStick' | 'R3'
  | 'Start' | 'Back' | 'Guide';

interface ControllerViewProps {
  className?: string;
  onButtonClick?: (key: ButtonKey) => void;
  highlightedButton?: ButtonKey | null;
  hidePanel?: boolean;
}

export const ControllerView: React.FC<ControllerViewProps> = ({ 
  className = '',
  onButtonClick,
  highlightedButton = null,
  hidePanel = false,
}) => {
  const gamepad = useGamepad();
  
  // Mouse fallback states
  const [hoveredButton, setHoveredButton] = useState<ButtonKey | null>(null);
  const [mousePressedButtons, setMousePressedButtons] = useState<Record<ButtonKey, boolean>>({
    A: false, B: false, X: false, Y: false,
    LB: false, RB: false, LT: false, RT: false,
    DpadUp: false, DpadDown: false, DpadLeft: false, DpadRight: false,
    LeftStick: false, L3: false, RightStick: false, R3: false,
    Start: false, Back: false, Guide: false,
  });
  
  const [showLabels, setShowLabels] = useState(true);
  const [pressedHistory, setPressedHistory] = useState<string[]>([]);
  
  // Track previous gamepad state for button press logging
  const prevGamepadButtons = useRef<Record<string, boolean>>({});

  // Monitor physical button press transitions
  useEffect(() => {
    if (gamepad.connected) {
      Object.keys(gamepad.buttons).forEach((key) => {
        const wasPressed = prevGamepadButtons.current[key];
        const isPressed = gamepad.buttons[key];
        if (isPressed && !wasPressed) {
          setPressedHistory((prev) => [`[GAMEPAD] ${key}`, ...prev.slice(0, 7)]);
          audioFeedback.play('click');
          if (onButtonClick) {
            onButtonClick(key as ButtonKey);
          }
        }
      });
      prevGamepadButtons.current = { ...gamepad.buttons };
    }
  }, [gamepad.buttons, gamepad.connected, onButtonClick]);

  // Keyboard navigation fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting inputs in text fields
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      let key: ButtonKey | null = null;
      switch (e.key.toLowerCase()) {
        case 'a': key = 'A'; break;
        case 'b': key = 'B'; break;
        case 'x': key = 'X'; break;
        case 'y': key = 'Y'; break;
        case 'q': key = 'LB'; break;
        case 'e': key = 'RB'; break;
        case '1': key = 'LT'; break;
        case '2': key = 'RT'; break;
        case 'arrowup': key = 'DpadUp'; break;
        case 'arrowdown': key = 'DpadDown'; break;
        case 'arrowleft': key = 'DpadLeft'; break;
        case 'arrowright': key = 'DpadRight'; break;
        case 'enter': key = 'Start'; break;
        case 'escape':
        case 'backspace': key = 'Back'; break;
        case '3':
        case 'l': key = 'L3'; break;
        case '4':
        case 'r': key = 'R3'; break;
        default: break;
      }

      if (key) {
        handleMousePress(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let key: ButtonKey | null = null;
      switch (e.key.toLowerCase()) {
        case 'a': key = 'A'; break;
        case 'b': key = 'B'; break;
        case 'x': key = 'X'; break;
        case 'y': key = 'Y'; break;
        case 'q': key = 'LB'; break;
        case 'e': key = 'RB'; break;
        case '1': key = 'LT'; break;
        case '2': key = 'RT'; break;
        case 'arrowup': key = 'DpadUp'; break;
        case 'arrowdown': key = 'DpadDown'; break;
        case 'arrowleft': key = 'DpadLeft'; break;
        case 'arrowright': key = 'DpadRight'; break;
        case 'enter': key = 'Start'; break;
        case 'escape':
        case 'backspace': key = 'Back'; break;
        case '3':
        case 'l': key = 'L3'; break;
        case '4':
        case 'r': key = 'R3'; break;
        default: break;
      }

      if (key) {
        handleMouseRelease(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onButtonClick]);

  // Trigger click simulation for mouse fallback
  const handleMousePress = (key: ButtonKey) => {
    setMousePressedButtons((prev) => ({ ...prev, [key]: true }));
    setPressedHistory((prev) => [`[MOUSE] ${key}`, ...prev.slice(0, 7)]);
    audioFeedback.play('click');
    if (onButtonClick) {
      onButtonClick(key);
    }
  };

  const handleMouseRelease = (key: ButtonKey) => {
    setMousePressedButtons((prev) => ({ ...prev, [key]: false }));
  };

  // Evaluate final active state of a button (merged mouse + physical controller)
  const isButtonActive = (key: ButtonKey): boolean => {
    if (gamepad.connected && gamepad.buttons[key] !== undefined) {
      return gamepad.buttons[key] || mousePressedButtons[key];
    }
    return mousePressedButtons[key];
  };

  // Get current trigger pressure (ranges from 0 to 1)
  const getTriggerValue = (key: 'LT' | 'RT'): number => {
    if (gamepad.connected && gamepad.buttonValues[key] !== undefined) {
      return Math.max(mousePressedButtons[key] ? 1 : 0, gamepad.buttonValues[key]);
    }
    return mousePressedButtons[key] ? 1 : 0;
  };

  const getButtonLabel = (key: ButtonKey): string => {
    switch (key) {
      case 'DpadUp': return 'D-Pad Up';
      case 'DpadDown': return 'D-Pad Down';
      case 'DpadLeft': return 'D-Pad Left';
      case 'DpadRight': return 'D-Pad Right';
      case 'LeftStick': return 'Left Stick (Axes)';
      case 'RightStick': return 'Right Stick (Axes)';
      case 'L3': return 'Left Click (L3)';
      case 'R3': return 'Right Click (R3)';
      case 'Guide': return 'Guide Button';
      default: return `${key} Button`;
    }
  };

  // Resolve button color for rendering inside SVG
  const getButtonColor = (key: ButtonKey): string => {
    const active = isButtonActive(key);
    if (active) {
      switch (key) {
        case 'A': return '#10b981'; // Xbox Green A
        case 'B': return '#ef4444'; // Xbox Red B
        case 'X': return '#3b82f6'; // Xbox Blue X
        case 'Y': return '#eab308'; // Xbox Yellow Y
        case 'Guide': return '#10b981'; // Green center LED
        default: return '#00f0ff'; // Cyber Cyan active
      }
    }
    if (highlightedButton === key) {
      return '#f59e0b'; // Pulsing Amber for active training targets!
    }
    if (hoveredButton === key) {
      return '#8b5cf6'; // Hover violet
    }
    return '#1f1f2e'; // Dark base
  };

  // Calculate dynamic stick movement offsets
  const getStickOffset = (stick: 'left' | 'right') => {
    const defaultOffsetMultiplier = 14;
    if (gamepad.connected) {
      if (stick === 'left') {
        return {
          x: gamepad.axes[0] * defaultOffsetMultiplier,
          y: gamepad.axes[1] * defaultOffsetMultiplier,
        };
      } else {
        return {
          x: gamepad.axes[2] * defaultOffsetMultiplier,
          y: gamepad.axes[3] * defaultOffsetMultiplier,
        };
      }
    }
    const active = isButtonActive(stick === 'left' ? 'LeftStick' : 'RightStick');
    if (active) {
      return stick === 'left' ? { x: -6, y: -9 } : { x: 9, y: 5 };
    }
    return { x: 0, y: 0 };
  };

  const lsOffset = getStickOffset('left');
  const rsOffset = getStickOffset('right');

  // Trigger values
  const ltVal = getTriggerValue('LT');
  const rtVal = getTriggerValue('RT');

  const renderSvgController = () => (
    <svg
      viewBox="0 0 600 450"
      className="w-full h-auto max-w-lg drop-shadow-[0_0_20px_rgba(0,0,0,0.6)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="xbox-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="body-gradient" x1="300" y1="50" x2="300" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e1e26" />
          <stop offset="0.6" stopColor="#121217" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
      </defs>

      {/* Blueprint HUD Lines */}
      {showLabels && (
        <g stroke="#8b5cf6" strokeWidth="1" opacity="0.3" strokeDasharray="3 3">
          <path d="M120 40 L80 40 H30" />
          <path d="M165 95 L100 80 H30" />
          <path d="M180 170 L110 170 H30" />
          <path d="M230 290 L120 290 H30" />
          <path d="M480 40 L520 40 H570" />
          <path d="M435 95 L500 80 H570" />
          <path d="M420 125 L490 120 H570" />
          <path d="M455 160 L510 175 H570" />
          <path d="M380 270 L480 270 H570" />
        </g>
      )}

      {/* Blueprint HUD Labels Text */}
      {showLabels && (
        <g fill="#9ca3af" fontSize="9" fontWeight="bold" fontFamily="var(--font-display)">
          <text x="25" y="36" textAnchor="start">LT (LEFT TRIGGER)</text>
          <text x="25" y="76" textAnchor="start">LB (LEFT BUMPER)</text>
          <text x="25" y="166" textAnchor="start">LS (LEFT STICK / L3)</text>
          <text x="25" y="286" textAnchor="start">D-PAD (DIRECTIONAL)</text>
          <text x="575" y="36" textAnchor="end">RT (RIGHT TRIGGER)</text>
          <text x="575" y="76" textAnchor="end">RB (RIGHT BUMPER)</text>
          <text x="575" y="116" textAnchor="end">ACTION BUTTONS (Y/B/A/X)</text>
          <text x="575" y="171" textAnchor="end">MELEE BUTTON (B)</text>
          <text x="575" y="266" textAnchor="end">RS (RIGHT STICK / R3)</text>
        </g>
      )}

      {/* Shoulder triggers (LT / RT) */}
      <path
        d="M100 80 C95 40, 130 30, 150 45 L135 90 Z"
        fill={getButtonColor('LT')}
        stroke={ltVal > 0 || highlightedButton === 'LT' ? '#eab308' : '#4b5563'}
        strokeWidth="2"
        fillOpacity={highlightedButton === 'LT' ? 0.7 : 0.2 + ltVal * 0.8}
        onMouseEnter={() => setHoveredButton('LT')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('LT'); }}
        onMouseDown={() => handleMousePress('LT')}
        onMouseUp={() => handleMouseRelease('LT')}
        className="cursor-pointer transition-all duration-150"
      />
      <path
        d="M500 80 C505 40, 470 30, 450 45 L465 90 Z"
        fill={getButtonColor('RT')}
        stroke={rtVal > 0 || highlightedButton === 'RT' ? '#eab308' : '#4b5563'}
        strokeWidth="2"
        fillOpacity={highlightedButton === 'RT' ? 0.7 : 0.2 + rtVal * 0.8}
        onMouseEnter={() => setHoveredButton('RT')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('RT'); }}
        onMouseDown={() => handleMousePress('RT')}
        onMouseUp={() => handleMouseRelease('RT')}
        className="cursor-pointer transition-all duration-150"
      />

      {/* Shoulder Bumpers (LB / RB) */}
      <path
        d="M110 95 C120 75, 180 75, 215 90 L210 105 C180 92, 130 92, 115 105 Z"
        fill={getButtonColor('LB')}
        stroke={isButtonActive('LB') || highlightedButton === 'LB' ? '#eab308' : '#4b5563'}
        strokeWidth="2"
        onMouseEnter={() => setHoveredButton('LB')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('LB'); }}
        onMouseDown={() => handleMousePress('LB')}
        onMouseUp={() => handleMouseRelease('LB')}
        className="cursor-pointer transition-all duration-150"
      />
      <path
        d="M490 95 C480 75, 420 75, 385 90 L390 105 C420 92, 470 92, 485 105 Z"
        fill={getButtonColor('RB')}
        stroke={isButtonActive('RB') || highlightedButton === 'RB' ? '#eab308' : '#4b5563'}
        strokeWidth="2"
        onMouseEnter={() => setHoveredButton('RB')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('RB'); }}
        onMouseDown={() => handleMousePress('RB')}
        onMouseUp={() => handleMouseRelease('RB')}
        className="cursor-pointer transition-all duration-150"
      />

      {/* Gamepad Main Controller Shell */}
      <path
        d="M170 105 C240 95, 360 95, 430 105 C500 115, 560 160, 570 230 C585 315, 520 405, 475 405 C435 405, 410 350, 390 320 C340 300, 260 300, 210 320 C190 350, 160 405, 125 405 C80 405, 15 315, 30 230 C40 160, 100 115, 170 105 Z"
        fill="url(#body-gradient)"
        stroke="#2d2d39"
        strokeWidth="4"
      />

      {/* Back & Start buttons */}
      <g
        transform="translate(255, 185)"
        onMouseEnter={() => setHoveredButton('Back')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Back'); }}
        onMouseDown={() => handleMousePress('Back')}
        onMouseUp={() => handleMouseRelease('Back')}
        className="cursor-pointer"
      >
        <rect x="-10" y="-7" width="20" height="14" rx="4" fill={getButtonColor('Back')} stroke={highlightedButton === 'Back' ? '#f59e0b' : '#4b5563'} strokeWidth="1.5" />
        <polygon points="-4,-3 -4,3 2,0" fill="#a1a1aa" transform="rotate(180)" />
      </g>
      <g
        transform="translate(345, 185)"
        onMouseEnter={() => setHoveredButton('Start')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Start'); }}
        onMouseDown={() => handleMousePress('Start')}
        onMouseUp={() => handleMouseRelease('Start')}
        className="cursor-pointer"
      >
        <rect x="-10" y="-7" width="20" height="14" rx="4" fill={getButtonColor('Start')} stroke={highlightedButton === 'Start' ? '#f59e0b' : '#4b5563'} strokeWidth="1.5" />
        <polygon points="-3,-3 -3,3 3,0" fill="#a1a1aa" />
      </g>

      {/* Central Guide Xbox Logo Button */}
      <g
        transform="translate(300, 185)"
        onMouseEnter={() => setHoveredButton('Guide')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Guide'); }}
        onMouseDown={() => handleMousePress('Guide')}
        onMouseUp={() => handleMouseRelease('Guide')}
        className="cursor-pointer"
      >
        <circle cx="0" cy="0" r="22" fill="#181822" stroke={highlightedButton === 'Guide' ? '#f59e0b' : '#4b5563'} strokeWidth="2.5" />
        <circle cx="0" cy="0" r="18" fill="url(#body-gradient)" stroke="#3f3f4e" strokeWidth="1" />
        <path
          d="M-8 -10 C-3 -3, 3 -3, 8 -10 C4 -5, -4 -5, -8 -10 Z"
          fill={isButtonActive('Guide') ? '#10b981' : '#52525b'}
        />
        <path
          d="M-12 5 C-4 0, 4 0, 12 5 C3 -1, -3 -1, -12 5 Z"
          fill={isButtonActive('Guide') ? '#10b981' : '#52525b'}
          transform="rotate(180)"
        />
        <path
          d="M-10 -10 A 14 14 0 0 1 -1 -14"
          stroke={isButtonActive('Guide') || highlightedButton === 'Guide' ? '#10b981' : '#27272a'}
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M1 -14 A 14 14 0 0 1 10 -10"
          stroke={isButtonActive('Guide') || highlightedButton === 'Guide' ? '#10b981' : '#27272a'}
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M10 10 A 14 14 0 0 1 1 14"
          stroke={isButtonActive('Guide') || highlightedButton === 'Guide' ? '#10b981' : '#27272a'}
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M-1 14 A 14 14 0 0 1 -10 10"
          stroke={isButtonActive('Guide') || highlightedButton === 'Guide' ? '#10b981' : '#27272a'}
          strokeWidth="2.5"
          fill="none"
        />
      </g>

      {/* Left Analog Stick (Top Left) */}
      <g
        transform="translate(180, 190)"
        onMouseEnter={() => setHoveredButton('LeftStick')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('L3'); }}
        onMouseDown={() => { handleMousePress('L3'); handleMousePress('LeftStick'); }}
        onMouseUp={() => { handleMouseRelease('L3'); handleMouseRelease('LeftStick'); }}
        className="cursor-pointer"
      >
        <circle cx="0" cy="0" r="44" fill="#0f0f13" stroke={highlightedButton === 'LeftStick' || highlightedButton === 'L3' ? '#f59e0b' : '#2e2e38'} strokeWidth="3" />
        <circle cx="0" cy="0" r="36" fill="#181822" stroke="#3c3c4e" strokeWidth="1" />
        <g transform={`translate(${lsOffset.x}, ${lsOffset.y}) ${isButtonActive('L3') ? 'scale(0.95)' : 'scale(1)'}`} className="transition-all duration-75">
          <circle
            cx="0"
            cy="0"
            r="28"
            fill={highlightedButton === 'LeftStick' || highlightedButton === 'L3' ? '#78350f' : '#23232c'}
            stroke={isButtonActive('L3') ? '#00f0ff' : (highlightedButton === 'LeftStick' || highlightedButton === 'L3' ? '#f59e0b' : '#4b5563')}
            strokeWidth="3.5"
            filter={isButtonActive('L3') ? 'url(#xbox-glow)' : 'none'}
          />
          <circle cx="-12" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="12" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="-12" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="12" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#373742" strokeWidth="1.5" />
        </g>
      </g>

      {/* Right Analog Stick (Bottom Right) */}
      <g
        transform="translate(380, 275)"
        onMouseEnter={() => setHoveredButton('RightStick')}
        onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('R3'); }}
        onMouseDown={() => { handleMousePress('R3'); handleMousePress('RightStick'); }}
        onMouseUp={() => { handleMouseRelease('R3'); handleMouseRelease('RightStick'); }}
        className="cursor-pointer"
      >
        <circle cx="0" cy="0" r="44" fill="#0f0f13" stroke={highlightedButton === 'RightStick' || highlightedButton === 'R3' ? '#f59e0b' : '#2e2e38'} strokeWidth="3" />
        <circle cx="0" cy="0" r="36" fill="#181822" stroke="#3c3c4e" strokeWidth="1" />
        <g transform={`translate(${rsOffset.x}, ${rsOffset.y}) ${isButtonActive('R3') ? 'scale(0.95)' : 'scale(1)'}`} className="transition-all duration-75">
          <circle
            cx="0"
            cy="0"
            r="28"
            fill={highlightedButton === 'RightStick' || highlightedButton === 'R3' ? '#78350f' : '#23232c'}
            stroke={isButtonActive('R3') ? '#00f0ff' : (highlightedButton === 'RightStick' || highlightedButton === 'R3' ? '#f59e0b' : '#4b5563')}
            strokeWidth="3.5"
            filter={isButtonActive('R3') ? 'url(#xbox-glow)' : 'none'}
          />
          <circle cx="-12" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="12" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="-12" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="12" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#373742" strokeWidth="1.5" />
        </g>
      </g>

      {/* Xbox 360 Circular D-PAD (Bottom Left) */}
      <g transform="translate(240, 275)">
        <circle cx="0" cy="0" r="40" fill="#181822" stroke={highlightedButton?.startsWith('Dpad') ? '#f59e0b' : '#2d2d38'} strokeWidth="3.5" />
        <path
          d="M -24 -24 L 0 0 L 24 -24 A 34 34 0 0 0 -24 -24 Z"
          fill={getButtonColor('DpadUp')}
          stroke="#373745"
          strokeWidth="1.5"
          onMouseEnter={() => setHoveredButton('DpadUp')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadUp'); }}
          onMouseDown={() => handleMousePress('DpadUp')}
          onMouseUp={() => handleMouseRelease('DpadUp')}
          className="cursor-pointer transition-colors duration-150"
        />
        <path
          d="M 24 -24 L 0 0 L 24 24 A 34 34 0 0 0 24 -24 Z"
          fill={getButtonColor('DpadRight')}
          stroke="#373745"
          strokeWidth="1.5"
          onMouseEnter={() => setHoveredButton('DpadRight')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadRight'); }}
          onMouseDown={() => handleMousePress('DpadRight')}
          onMouseUp={() => handleMouseRelease('DpadRight')}
          className="cursor-pointer transition-colors duration-150"
        />
        <path
          d="M 24 24 L 0 0 L -24 24 A 34 34 0 0 0 24 24 Z"
          fill={getButtonColor('DpadDown')}
          stroke="#373745"
          strokeWidth="1.5"
          onMouseEnter={() => setHoveredButton('DpadDown')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadDown'); }}
          onMouseDown={() => handleMousePress('DpadDown')}
          onMouseUp={() => handleMouseRelease('DpadDown')}
          className="cursor-pointer transition-colors duration-150"
        />
        <path
          d="M -24 24 L 0 0 L -24 -24 A 34 34 0 0 0 -24 24 Z"
          fill={getButtonColor('DpadLeft')}
          stroke="#373745"
          strokeWidth="1.5"
          onMouseEnter={() => setHoveredButton('DpadLeft')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadLeft'); }}
          onMouseDown={() => handleMousePress('DpadLeft')}
          onMouseUp={() => handleMouseRelease('DpadLeft')}
          className="cursor-pointer transition-colors duration-150"
        />
        <circle cx="0" cy="0" r="10" fill="#24242d" stroke="#2d2d38" strokeWidth="1" pointerEvents="none" />
        <polygon points="0,-18 -4,-12 4,-12" fill="#888" pointerEvents="none" />
        <polygon points="18,0 12,-4 12,4" fill="#888" pointerEvents="none" />
        <polygon points="0,18 -4,12 4,12" fill="#888" pointerEvents="none" />
        <polygon points="-18,0 -12,-4 -12,4" fill="#888" pointerEvents="none" />
      </g>

      {/* Action Buttons: A, B, X, Y (Right Side) */}
      <g transform="translate(420, 190)">
        <circle cx="0" cy="0" r="45" fill="#14141a" opacity="0.3" />
        <g
          transform="translate(0, 26)"
          onMouseEnter={() => setHoveredButton('A')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('A'); }}
          onMouseDown={() => handleMousePress('A')}
          onMouseUp={() => handleMouseRelease('A')}
          className="cursor-pointer"
        >
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonColor('A')}
            stroke={hoveredButton === 'A' || isButtonActive('A') || highlightedButton === 'A' ? '#10b981' : '#047857'}
            strokeWidth="2"
            filter={isButtonActive('A') ? 'url(#xbox-glow)' : 'none'}
          />
          <text x="0" y="4" textAnchor="middle" fill={isButtonActive('A') ? '#fff' : '#10b981'} fontSize="12" fontWeight="bold" fontFamily="monospace">A</text>
        </g>
        <g
          transform="translate(26, 0)"
          onMouseEnter={() => setHoveredButton('B')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('B'); }}
          onMouseDown={() => handleMousePress('B')}
          onMouseUp={() => handleMouseRelease('B')}
          className="cursor-pointer"
        >
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonColor('B')}
            stroke={hoveredButton === 'B' || isButtonActive('B') || highlightedButton === 'B' ? '#ef4444' : '#b91c1c'}
            strokeWidth="2"
            filter={isButtonActive('B') ? 'url(#xbox-glow)' : 'none'}
          />
          <text x="0" y="4" textAnchor="middle" fill={isButtonActive('B') ? '#fff' : '#f87171'} fontSize="12" fontWeight="bold" fontFamily="monospace">B</text>
        </g>
        <g
          transform="translate(-26, 0)"
          onMouseEnter={() => setHoveredButton('X')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('X'); }}
          onMouseDown={() => handleMousePress('X')}
          onMouseUp={() => handleMouseRelease('X')}
          className="cursor-pointer"
        >
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonColor('X')}
            stroke={hoveredButton === 'X' || isButtonActive('X') || highlightedButton === 'X' ? '#3b82f6' : '#1d4ed8'}
            strokeWidth="2"
            filter={isButtonActive('X') ? 'url(#xbox-glow)' : 'none'}
          />
          <text x="0" y="4" textAnchor="middle" fill={isButtonActive('X') ? '#fff' : '#60a5fa'} fontSize="12" fontWeight="bold" fontFamily="monospace">X</text>
        </g>
        <g
          transform="translate(0, -26)"
          onMouseEnter={() => setHoveredButton('Y')}
          onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Y'); }}
          onMouseDown={() => handleMousePress('Y')}
          onMouseUp={() => handleMouseRelease('Y')}
          className="cursor-pointer"
        >
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonColor('Y')}
            stroke={hoveredButton === 'Y' || isButtonActive('Y') || highlightedButton === 'Y' ? '#eab308' : '#a16207'}
            strokeWidth="2"
            filter={isButtonActive('Y') ? 'url(#xbox-glow)' : 'none'}
          />
          <text x="0" y="4.5" textAnchor="middle" fill={isButtonActive('Y') ? '#fff' : '#facc15'} fontSize="11" fontWeight="bold" fontFamily="monospace">Y</text>
        </g>
      </g>
    </svg>
  );

  if (hidePanel) {
    return (
      <div className={`w-full flex flex-col items-center justify-center ${className}`}>
        {renderSvgController()}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch ${className}`}>
      
      {/* Visual Controller Box (Left/8 columns) */}
      <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between select-none">
        
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-purple/5 blur-[100px] pointer-events-none" />

        {/* Panel header controls */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4 z-10">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-brand-cyan animate-pulse" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white font-display">
              Xbox 360 Telemetry Calibration
            </h3>
          </div>
          <button
            onClick={() => setShowLabels((prev) => !prev)}
            className={`px-3 py-1 rounded-lg border text-[9px] font-bold font-display uppercase tracking-wider transition-colors ${
              showLabels
                ? 'border-brand-purple text-brand-purple bg-brand-purple/5'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {showLabels ? 'Hide Blueprint HUD' : 'Show Blueprint HUD'}
          </button>
        </div>

        {/* SVG Gamepad Frame */}
        <div className="flex-1 flex items-center justify-center min-h-[360px] py-4 relative z-10">
          {renderSvgController()}
        </div>

        {/* Dynamic status helper footer */}
        <div className="text-zinc-500 text-[10px] text-center border-t border-zinc-900/60 pt-3 flex justify-between uppercase font-bold tracking-wider">
          <span>Web Gamepad API Integration</span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className={`h-1.5 w-1.5 rounded-full ${gamepad.connected ? 'bg-brand-green animate-pulse' : 'bg-red-500'}`} />
            {gamepad.connected ? 'Physical Device Linked' : 'Awaiting physical link'}
          </span>
        </div>
        
      </div>

      {/* Button Telemetry Display Panel (Right/4 columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Real-time State Monitor */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex-1 flex flex-col justify-between text-left space-y-4">
          <div className="border-b border-zinc-900 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-brand-cyan">
                Hardware Link Status
              </h3>
              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                gamepad.connected 
                  ? 'border-brand-green bg-brand-green/5 text-brand-green'
                  : 'border-red-500/20 bg-red-500/5 text-red-400'
              }`}>
                {gamepad.connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            
            {/* Device name */}
            <div className="mt-2.5 flex items-start gap-2 p-2.5 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
              <Gamepad2 className={`h-4.5 w-4.5 flex-shrink-0 mt-0.5 ${gamepad.connected ? 'text-brand-green' : 'text-zinc-600'}`} />
              <div className="overflow-hidden">
                <span className="block text-[8px] uppercase font-bold text-zinc-500 tracking-wider">Active Device ID</span>
                <span className="text-[10px] text-zinc-300 font-semibold block truncate leading-snug">
                  {gamepad.connected ? gamepad.id : 'No gamepad detected.'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {/* Hover state */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Targeted Element</span>
              <div className="px-4 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 font-display">Cursor Hover</span>
                <span className={`text-xs font-black uppercase font-display tracking-wider ${hoveredButton ? 'text-brand-cyan text-glow-cyan' : 'text-zinc-600'}`}>
                  {hoveredButton ? getButtonLabel(hoveredButton) : 'None'}
                </span>
              </div>
            </div>

            {/* Active Axis display (Analog sticks coordinates) */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Stick Coordinates (Axes)</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {/* Left Stick coordinates */}
                <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1">
                  <span className="block font-sans text-[8px] font-bold text-zinc-500 uppercase tracking-wide">Left Stick (LS)</span>
                  <div className="flex justify-between">
                    <span>X: {gamepad.axes[0].toFixed(2)}</span>
                    <span>Y: {gamepad.axes[1].toFixed(2)}</span>
                  </div>
                </div>

                {/* Right Stick coordinates */}
                <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1">
                  <span className="block font-sans text-[8px] font-bold text-zinc-500 uppercase tracking-wide">Right Stick (RS)</span>
                  <div className="flex justify-between">
                    <span>X: {gamepad.axes[2].toFixed(2)}</span>
                    <span>Y: {gamepad.axes[3].toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Analog Trigger meters */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block font-display">Trigger Pressure Matrix</span>
              <div className="space-y-1.5 font-mono text-[10px]">
                {/* LT Meter */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5 text-[9px]">
                    <span className="font-sans font-bold">LEFT TRIGGER (LT)</span>
                    <span className="text-brand-cyan">{(ltVal * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan transition-all duration-75" style={{ width: `${ltVal * 100}%` }} />
                  </div>
                </div>

                {/* RT Meter */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5 text-[9px]">
                    <span className="font-sans font-bold">RIGHT TRIGGER (RT)</span>
                    <span className="text-brand-cyan">{(rtVal * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan transition-all duration-75" style={{ width: `${rtVal * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="p-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-xl flex items-start gap-2">
            <Info className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-zinc-500 leading-normal">
              Connect a physical controller and **press any button** to awaken browser telemetry hooks. Axis coordinates and trigger meters will reflect physical inputs.
            </p>
          </div>
        </div>

        {/* Input Logs History */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 h-40 flex flex-col justify-between text-left space-y-3">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
              Signal Log Buffer
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[9px] text-zinc-400">
            {pressedHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[9px] text-zinc-600 font-sans uppercase font-bold tracking-wider">
                Buffer Empty - Press buttons to log
              </div>
            ) : (
              pressedHistory.map((key, index) => (
                <div key={index} className="flex justify-between items-center py-0.5 border-b border-zinc-900/40">
                  <span className="text-zinc-500">SIG_IN_[{pressedHistory.length - index}]</span>
                  <span className="font-semibold text-brand-cyan">{key} SIGNAL MATCHED</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
