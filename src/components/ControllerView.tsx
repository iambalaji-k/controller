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

export const ControllerView: React.FC<ControllerViewProps> = React.memo(({ 
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
  
  const [pressedHistory, setPressedHistory] = useState<string[]>([]);
  
  // Evaluate final active state of a button (merged mouse + physical controller + keyboard)
  const isButtonActive = (key: ButtonKey): boolean => {
    if (gamepad.connected) {
      if (key === 'LeftStick') {
        return Math.abs(gamepad.axes[0]) > 0.3 || Math.abs(gamepad.axes[1]) > 0.3 || mousePressedButtons[key];
      }
      if (key === 'RightStick') {
        return Math.abs(gamepad.axes[2]) > 0.3 || Math.abs(gamepad.axes[3]) > 0.3 || mousePressedButtons[key];
      }
      if (gamepad.buttons[key] !== undefined) {
        return gamepad.buttons[key] || mousePressedButtons[key];
      }
    }
    return mousePressedButtons[key];
  };

  // Track previous active states to monitor transitions
  const prevActiveStates = useRef<Record<ButtonKey, boolean>>({
    A: false, B: false, X: false, Y: false,
    LB: false, RB: false, LT: false, RT: false,
    DpadUp: false, DpadDown: false, DpadLeft: false, DpadRight: false,
    LeftStick: false, L3: false, RightStick: false, R3: false,
    Start: false, Back: false, Guide: false,
  });

  // Unified transition monitor for physical, mouse, and keyboard inputs
  useEffect(() => {
    const keys: ButtonKey[] = [
      'A', 'B', 'X', 'Y', 
      'LB', 'RB', 'LT', 'RT', 
      'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight',
      'LeftStick', 'L3', 'RightStick', 'R3',
      'Start', 'Back', 'Guide'
    ];
    keys.forEach((key) => {
      const wasActive = prevActiveStates.current[key];
      const isActive = isButtonActive(key);
      if (isActive && !wasActive) {
        console.log(`[ControllerView Transition] ${key} went active. Calling onButtonClick.`);
        setPressedHistory((prev) => [`[ACTIVE] ${key}`, ...prev.slice(0, 7)]);
        audioFeedback.play('click');
        if (onButtonClick) {
          onButtonClick(key);
        }
      }
      prevActiveStates.current[key] = isActive;
    });
  }, [gamepad, mousePressedButtons, onButtonClick]);

  // Keyboard navigation fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      let key: ButtonKey | null = null;
      switch (e.key.toLowerCase()) {
        case 'a': key = 'A'; break;
        case 'b': key = 'B'; break;
        case 'x': key = 'X'; break;
        case 'y': key = 'Y'; break;
        case 'q':
        case 'l': key = 'LB'; break;
        case 'e':
        case 'r': key = 'RB'; break;
        case '1': key = 'LT'; break;
        case '2': key = 'RT'; break;
        case 'arrowup': key = 'DpadUp'; break;
        case 'arrowdown': key = 'DpadDown'; break;
        case 'arrowleft': key = 'DpadLeft'; break;
        case 'arrowright': key = 'DpadRight'; break;
        case 'enter': key = 'Start'; break;
        case 'escape':
        case 'backspace': key = 'Back'; break;
        case '3': key = 'L3'; break;
        case '4': key = 'R3'; break;
        case '5': key = 'LeftStick'; break;
        case '6': key = 'RightStick'; break;
        default: break;
      }

      if (key) {
        console.log(`[ControllerView KeyDown] Key: ${e.key}, mapped to ButtonKey: ${key}`);
        handleMousePress(key);
      } else {
        console.log(`[ControllerView KeyDown] Key: ${e.key} not mapped.`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let key: ButtonKey | null = null;
      switch (e.key.toLowerCase()) {
        case 'a': key = 'A'; break;
        case 'b': key = 'B'; break;
        case 'x': key = 'X'; break;
        case 'y': key = 'Y'; break;
        case 'q':
        case 'l': key = 'LB'; break;
        case 'e':
        case 'r': key = 'RB'; break;
        case '1': key = 'LT'; break;
        case '2': key = 'RT'; break;
        case 'arrowup': key = 'DpadUp'; break;
        case 'arrowdown': key = 'DpadDown'; break;
        case 'arrowleft': key = 'DpadLeft'; break;
        case 'arrowright': key = 'DpadRight'; break;
        case 'enter': key = 'Start'; break;
        case 'escape':
        case 'backspace': key = 'Back'; break;
        case '3': key = 'L3'; break;
        case '4': key = 'R3'; break;
        case '5': key = 'LeftStick'; break;
        case '6': key = 'RightStick'; break;
        default: break;
      }

      if (key) {
        console.log(`[ControllerView KeyUp] Key: ${e.key}, mapped to ButtonKey: ${key}`);
        handleMouseRelease(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Trigger click simulation for mouse fallback
  const handleMousePress = (key: ButtonKey) => {
    setMousePressedButtons((prev) => ({ ...prev, [key]: true }));
  };

  const handleMouseRelease = (key: ButtonKey) => {
    setMousePressedButtons((prev) => ({ ...prev, [key]: false }));
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
    const defaultOffsetMultiplier = 25;
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
      return stick === 'left' ? { x: -10, y: -16 } : { x: 16, y: 9 };
    }
    return { x: 0, y: 0 };
  };

  const lsOffset = getStickOffset('left');
  const rsOffset = getStickOffset('right');

  // Trigger values
  const ltVal = getTriggerValue('LT');
  const rtVal = getTriggerValue('RT');

  const renderSvgController = () => (
    <svg viewBox="0 0 1068 830" className="w-full h-auto max-w-lg drop-shadow-[0_0_20px_rgba(0,0,0,0.6)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="xbox-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="body-gradient" x1="534" y1="50" x2="534" y2="750" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e1e26" />
          <stop offset="0.6" stopColor="#121217" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
      </defs>

      {/* Controller body */}
      <path d="M898.499 173.5C908.539 181.574 917.999 194.5 923.499 210.5C976.472 335.242 1059.71 530.705 1062.06 669.545C1063.3 738.195 1034.12 806.547 954.834 822.353C940.181 825.344 884.859 776.216 851.153 729.395C799.59 658.523 780.836 619.733 688.902 616.871L382.216 617.341C311.087 618.793 286.181 643.998 252.219 696.629C209.67 755.625 158.876 814.792 112.823 822.951C49.9397 809.879 9.05662 759.256 8.5867 674.329C7.60414 574.194 57 429.5 88 348.5C107.518 297.5 125.942 253.976 143.5 211C149.628 196 158 186 166.5 176" fill="url(#body-gradient)" stroke="#2d2d39" strokeWidth="4" strokeMiterlimit="10" />
      <path d="M952.656 821.498C930.869 777.924 867.472 716.023 812.15 655.447C772.762 611.83 752.086 603.243 690.74 603.243H383.113C325.74 603.243 303.91 611.83 263.027 656.13C210.311 713.845 149.862 770.491 112.738 822.737" stroke="#2d2d39" strokeWidth="4" strokeMiterlimit="10" />

      {/* Decorative center circle behind D-pad */}
      <circle cx="397.5" cy="459.5" r="82.5" fill="#0f0f13" stroke="#2e2e38" strokeWidth="4" />

      {/* Top connecting seam */}
      <path d="M372.5 114L481.5 112L697 114" stroke="#2d2d39" strokeWidth="4" />

      {/* LT Trigger Wing */}
      <path d="M283.638 82.3742L236.395 95.0328C235.667 95.2279 234.346 94.7617 233.772 93.0322C231.468 86.0869 227.056 71.8687 225.001 59.1377C224.647 56.9489 224.142 54.5628 223.643 52.1331C223.14 49.6825 222.636 47.1571 222.259 44.5991C221.501 39.4618 221.284 34.3664 222.534 29.7676C223.762 25.2468 226.433 21.1053 231.687 17.8419C237.006 14.538 245.07 12.0775 257.143 11.2151C258.14 11.144 259.763 11.4995 261.358 12.3452C262.95 13.1893 264.157 14.3314 264.661 15.5082C270.649 29.4788 277.052 52.6857 284.326 76.8567L284.344 76.9175L284.366 76.9764C284.905 78.4282 285.022 79.8474 284.8 80.8699C284.587 81.8461 284.15 82.237 283.638 82.3742Z" fill={ltVal > 0 || highlightedButton === 'LT' ? '#eab308' : '#1f1f26'} fillOpacity={highlightedButton === 'LT' ? 0.7 : 0.2 + ltVal * 0.8} stroke={ltVal > 0 || highlightedButton === 'LT' ? '#eab308' : '#4b5563'} strokeWidth="2" onMouseEnter={() => setHoveredButton('LT')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('LT'); }} onMouseDown={() => handleMousePress('LT')} onMouseUp={() => handleMouseRelease('LT')} className="cursor-pointer" />

      {/* RT Trigger Wing */}
      <path d="M783.517 81.8176L830.76 94.4762C831.488 94.6713 832.809 94.205 833.383 92.4755C835.687 85.5303 840.098 71.312 842.154 58.5811C842.508 56.3922 843.012 54.0061 843.511 51.5765C844.015 49.1259 844.519 46.6004 844.896 44.0425C845.654 38.9052 845.871 33.8098 844.621 29.211C843.393 24.6902 840.722 20.5486 835.468 17.2853C830.149 13.9813 822.085 11.5208 810.012 10.6585C809.015 10.5873 807.392 10.9429 805.797 11.7886C804.204 12.6326 802.998 13.7748 802.493 14.9515C796.506 28.9222 790.103 52.1291 782.829 76.3001L782.811 76.3609L782.789 76.4197C782.25 77.8715 782.133 79.2908 782.355 80.3132C782.568 81.2895 783.005 81.6804 783.517 81.8176Z" fill={rtVal > 0 || highlightedButton === 'RT' ? '#eab308' : '#1f1f26'} fillOpacity={highlightedButton === 'RT' ? 0.7 : 0.2 + rtVal * 0.8} stroke={rtVal > 0 || highlightedButton === 'RT' ? '#eab308' : '#4b5563'} strokeWidth="2" onMouseEnter={() => setHoveredButton('RT')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('RT'); }} onMouseDown={() => handleMousePress('RT')} onMouseUp={() => handleMouseRelease('RT')} className="cursor-pointer" />

      {/* LB Bumper */}
      <path d="M173.5 156.5C169.866 164.574 167.5 172.667 166.5 176C186 154 272.5 118 332 116L372 114C366 110.333 354.821 101.457 353 99.9999C350.5 97.9999 343.5 92 338 90.5C234 85.5 178 146.5 173.5 156.5Z" fill={getButtonColor('LB')} stroke={isButtonActive('LB') || highlightedButton === 'LB' ? '#eab308' : '#4b5563'} strokeWidth="2" onMouseEnter={() => setHoveredButton('LB')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('LB'); }} onMouseDown={() => handleMousePress('LB')} onMouseUp={() => handleMouseRelease('LB')} className="cursor-pointer" />

      {/* RB Bumper */}
      <path d="M726 92.5C724.176 93.4121 706.333 106.5 697 114C741.5 115 818 120.5 899.5 174L892.5 153.5C870.5 111.5 774.122 90 748.5 90C741 90 729 91 726 92.5Z" fill={getButtonColor('RB')} stroke={isButtonActive('RB') || highlightedButton === 'RB' ? '#eab308' : '#4b5563'} strokeWidth="2" onMouseEnter={() => setHoveredButton('RB')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('RB'); }} onMouseDown={() => handleMousePress('RB')} onMouseUp={() => handleMouseRelease('RB')} className="cursor-pointer" />

      {/* Left Stick */}
      <g onMouseEnter={() => setHoveredButton('LeftStick')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('L3'); }} onMouseDown={() => { handleMousePress('L3'); handleMousePress('LeftStick'); }} onMouseUp={() => { handleMouseRelease('L3'); handleMouseRelease('LeftStick'); }} className="cursor-pointer">
        <circle cx="266" cy="288" r="78" fill="#0f0f13" stroke={highlightedButton === 'LeftStick' || highlightedButton === 'L3' ? '#f59e0b' : '#2e2e38'} strokeWidth="3" />
        <circle cx="265.5" cy="289.5" r="63.5" fill="#181822" stroke="#3c3c4e" strokeWidth="1" />
        <g transform={`translate(${266 + lsOffset.x}, ${288 + lsOffset.y}) ${isButtonActive('L3') ? 'scale(0.95)' : 'scale(1)'}`}>
          <circle cx="0" cy="0" r="38" fill={highlightedButton === 'LeftStick' || highlightedButton === 'L3' ? '#78350f' : '#23232c'} stroke={isButtonActive('L3') ? '#00f0ff' : (highlightedButton === 'LeftStick' || highlightedButton === 'L3' ? '#f59e0b' : '#4b5563')} strokeWidth="3.5" filter={isButtonActive('L3') ? 'url(#xbox-glow)' : 'none'} />
          <circle cx="-14" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="14" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="-14" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="14" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="0" r="16" fill="none" stroke="#373742" strokeWidth="1.5" />
        </g>
      </g>

      {/* Right Stick */}
      <g onMouseEnter={() => setHoveredButton('RightStick')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('R3'); }} onMouseDown={() => { handleMousePress('R3'); handleMousePress('RightStick'); }} onMouseUp={() => { handleMouseRelease('R3'); handleMouseRelease('RightStick'); }} className="cursor-pointer">
        <circle cx="670.5" cy="446.5" r="77.5" fill="#0f0f13" stroke={highlightedButton === 'RightStick' || highlightedButton === 'R3' ? '#f59e0b' : '#2e2e38'} strokeWidth="3" />
        <circle cx="671.5" cy="446.5" r="64.5" fill="#181822" stroke="#3c3c4e" strokeWidth="1" />
        <g transform={`translate(${670.5 + rsOffset.x}, ${446.5 + rsOffset.y}) ${isButtonActive('R3') ? 'scale(0.95)' : 'scale(1)'}`}>
          <circle cx="0" cy="0" r="38" fill={highlightedButton === 'RightStick' || highlightedButton === 'R3' ? '#78350f' : '#23232c'} stroke={isButtonActive('R3') ? '#00f0ff' : (highlightedButton === 'RightStick' || highlightedButton === 'R3' ? '#f59e0b' : '#4b5563')} strokeWidth="3.5" filter={isButtonActive('R3') ? 'url(#xbox-glow)' : 'none'} />
          <circle cx="-14" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="14" cy="0" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="-14" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="14" r="2.5" fill="#4b5563" />
          <circle cx="0" cy="0" r="16" fill="none" stroke="#373742" strokeWidth="1.5" />
        </g>
      </g>

      {/* View/Back Button */}
      <g onMouseEnter={() => setHoveredButton('Back')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Back'); }} onMouseDown={() => handleMousePress('Back')} onMouseUp={() => handleMouseRelease('Back')} className="cursor-pointer">
        <path d="M435 290.619C435 273.623 447.991 265.22 459.928 265.22C478.432 265.22 485 279.868 485 288.741C485 304.562 474.645 315.22 461.031 315.22C445.499 315.22 435 302.825 435 290.619Z" fill={getButtonColor('Back')} stroke={highlightedButton === 'Back' ? '#f59e0b' : '#4b5563'} strokeWidth="2" />
        <rect x="457" y="289" width="14" height="11" rx="1" fill="none" stroke={isButtonActive('Back') ? '#00f0ff' : '#a1a1aa'} strokeWidth="2" pointerEvents="none" />
      </g>

      {/* Start/Menu Button */}
      <g onMouseEnter={() => setHoveredButton('Start')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Start'); }} onMouseDown={() => handleMousePress('Start')} onMouseUp={() => handleMouseRelease('Start')} className="cursor-pointer">
        <path d="M585 290.153C585 272.064 596.885 265.22 612.207 265.22C630.204 265.22 635 281.753 635 289.131C635 305.709 622.903 315.22 611.952 315.22C596.163 315.22 585 303.62 585 290.153Z" fill={getButtonColor('Start')} stroke={highlightedButton === 'Start' ? '#f59e0b' : '#4b5563'} strokeWidth="2" />
        <line x1="598" y1="283" x2="622" y2="283" stroke={isButtonActive('Start') ? '#00f0ff' : '#a1a1aa'} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
        <line x1="598" y1="290" x2="622" y2="290" stroke={isButtonActive('Start') ? '#00f0ff' : '#a1a1aa'} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
        <line x1="598" y1="297" x2="622" y2="297" stroke={isButtonActive('Start') ? '#00f0ff' : '#a1a1aa'} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
      </g>

      {/* Share Button (decorative) */}
      <path d="M546.577 329.588H522.184C513.085 329.588 505.651 335.526 505.651 346.932C505.651 354.365 510.735 363.507 521.543 363.507H547.432C554.139 363.507 562.042 358.894 562.042 346.676C562.042 338.73 556.403 329.588 546.577 329.588Z" fill="#1f1f2e" stroke="#4b5563" strokeWidth="2" />
      <line x1="533.5" y1="338.625" x2="533.5" y2="349.125" stroke="#a1a1aa" strokeWidth="3" strokeLinecap="round" />
      <polyline points="541.208,343 533.5,338.625 525.792,343" stroke="#a1a1aa" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Guide/Xbox Logo Button */}
      <g onMouseEnter={() => setHoveredButton('Guide')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Guide'); }} onMouseDown={() => handleMousePress('Guide')} onMouseUp={() => handleMouseRelease('Guide')} className="cursor-pointer">
        <circle cx="533" cy="184" r="42" fill="#181822" stroke={highlightedButton === 'Guide' ? '#f59e0b' : '#4b5563'} strokeWidth="2.5" />
        <circle cx="533" cy="184" r="36" fill="url(#body-gradient)" stroke="#3f3f4e" strokeWidth="1.5" />
        <g>
          <path d="M551.801 146.434C545.936 143.492 539.611 142 533 142C526.48 142 520.232 143.453 514.429 146.319C513.828 146.616 513.461 147.241 513.495 147.911C513.529 148.581 513.958 149.167 514.587 149.402C520.97 151.78 526.917 154.976 532.263 158.899C532.559 159.118 532.908 159.226 533.257 159.226C533.607 159.226 533.956 159.118 534.252 158.899C539.519 155.033 545.369 151.874 551.64 149.508C552.265 149.273 552.691 148.689 552.726 148.023C552.761 147.356 552.397 146.733 551.801 146.434ZM533.257 155.472C529.005 152.458 524.406 149.878 519.534 147.768C528.201 144.536 538.104 144.574 546.741 147.873C541.96 149.961 537.441 152.507 533.257 155.472Z" fill={isButtonActive('Guide') ? '#10b981' : '#52525b'} />
          <path d="M559.35 151.293C558.799 150.849 558.029 150.798 557.423 151.165C553.339 153.642 547.022 157.695 540.127 162.935C539.739 163.229 539.498 163.677 539.466 164.165C539.435 164.651 539.616 165.127 539.962 165.468C542.397 167.876 544.685 170.499 546.761 173.265C556.341 186.039 560.099 196.04 561.441 202.909C556.593 191.847 547.513 180.59 534.349 169.342C533.72 168.804 532.794 168.804 532.166 169.342C518.983 180.606 509.899 191.875 505.055 202.947C506.395 196.02 510.174 186.039 519.754 173.265C521.83 170.499 524.117 167.874 526.553 165.468C526.9 165.127 527.08 164.65 527.049 164.165C527.017 163.677 526.776 163.229 526.388 162.935C519.37 157.604 512.948 153.495 508.796 150.987C508.195 150.622 507.431 150.673 506.882 151.108C496.789 159.132 491 171.121 491 184C491 194.239 494.726 204.102 501.492 211.771C501.683 211.988 501.921 212.147 502.181 212.241C502.252 212.51 502.39 212.761 502.588 212.968C510.596 221.373 521.397 226 533 226C544.667 226 555.907 221.085 563.835 212.517C564.062 212.272 564.207 211.97 564.259 211.65C564.568 211.56 564.85 211.381 565.068 211.125C571.472 203.559 575 193.927 575 184C575 171.236 569.296 159.315 559.35 151.293ZM501.218 205.979C496.772 199.552 494.362 191.898 494.362 184C494.362 172.541 499.343 161.848 508.071 154.48C511.817 156.776 517.068 160.179 522.825 164.462C520.78 166.596 518.848 168.871 517.065 171.249C505.394 186.811 501.969 198.607 501.218 205.979ZM533 222.638C522.634 222.638 512.963 218.623 505.666 211.31C508.979 198.822 518.255 185.888 533.257 172.838C548.091 185.741 557.328 198.536 560.737 210.9C553.484 218.37 543.428 222.638 533 222.638ZM549.45 171.248C547.666 168.871 545.734 166.596 543.689 164.462C549.325 160.271 554.468 156.927 558.145 154.663C566.736 162.026 571.638 172.651 571.638 184C571.638 191.614 569.383 199.038 565.22 205.33C564.34 198.035 560.831 186.423 549.45 171.248Z" fill={isButtonActive('Guide') ? '#10b981' : '#52525b'} />
        </g>
      </g>

      {/* Y Button */}
      <g onMouseEnter={() => setHoveredButton('Y')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('Y'); }} onMouseDown={() => handleMousePress('Y')} onMouseUp={() => handleMouseRelease('Y')} className="cursor-pointer">
        <circle cx="804" cy="221" r="35" fill={getButtonColor('Y')} stroke={hoveredButton === 'Y' || isButtonActive('Y') || highlightedButton === 'Y' ? '#eab308' : '#a16207'} strokeWidth="2" filter={isButtonActive('Y') ? 'url(#xbox-glow)' : 'none'} />
        <path d="M786.475 200.507H793.225L804.503 222.508L816.977 200.507H823.001L806.938 228.488V250.019H801.342V228.488L786.475 200.507Z" fill={isButtonActive('Y') ? '#fff' : '#facc15'} pointerEvents="none" />
      </g>

      {/* B Button */}
      <g onMouseEnter={() => setHoveredButton('B')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('B'); }} onMouseDown={() => handleMousePress('B')} onMouseUp={() => handleMouseRelease('B')} className="cursor-pointer">
        <circle cx="875" cy="293" r="35" fill={getButtonColor('B')} stroke={hoveredButton === 'B' || isButtonActive('B') || highlightedButton === 'B' ? '#ef4444' : '#b91c1c'} strokeWidth="2" filter={isButtonActive('B') ? 'url(#xbox-glow)' : 'none'} />
        <path d="M861.808 272.086H875.222C884.706 272.086 888.935 277.17 888.935 283.065C888.935 287.807 886.287 291.267 882.1 292.976C887.483 293.916 891.028 298.06 891.028 303.955C891.028 311.303 885.646 315.746 877.273 315.746H861.808V272.086ZM867.191 276.315V290.883H872.616C879.879 290.883 883.339 287.807 883.339 282.937C883.339 278.75 880.263 276.315 874.24 276.315H867.191ZM867.191 294.898V311.046H876.205C882.228 311.046 885.304 308.227 885.304 302.972C885.304 297.675 880.519 294.898 872.872 294.898H867.191Z" fill={isButtonActive('B') ? '#fff' : '#f87171'} pointerEvents="none" />
      </g>

      {/* A Button */}
      <g onMouseEnter={() => setHoveredButton('A')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('A'); }} onMouseDown={() => handleMousePress('A')} onMouseUp={() => handleMouseRelease('A')} className="cursor-pointer">
        <circle cx="804" cy="362" r="35" fill={getButtonColor('A')} stroke={hoveredButton === 'A' || isButtonActive('A') || highlightedButton === 'A' ? '#10b981' : '#047857'} strokeWidth="2" filter={isButtonActive('A') ? 'url(#xbox-glow)' : 'none'} />
        <path d="M805.044 337L822.858 382.24H815.809L811 369H794.5L788.639 382.24H783L801.754 337H805.044ZM803 347L795.5 365.409H811L803 347Z" fill={isButtonActive('A') ? '#fff' : '#10b981'} pointerEvents="none" />
      </g>

      {/* X Button */}
      <g onMouseEnter={() => setHoveredButton('X')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('X'); }} onMouseDown={() => handleMousePress('X')} onMouseUp={() => handleMouseRelease('X')} className="cursor-pointer">
        <circle cx="733" cy="289" r="35" fill={getButtonColor('X')} stroke={hoveredButton === 'X' || isButtonActive('X') || highlightedButton === 'X' ? '#3b82f6' : '#1d4ed8'} strokeWidth="2" filter={isButtonActive('X') ? 'url(#xbox-glow)' : 'none'} />
        <path d="M716 268H722.08L732.634 286.2L743.149 268H749L735.884 290.235L748.121 310H742.041L732.213 293.241L722.156 310H716.115L728.963 289.535L716 268Z" fill={isButtonActive('X') ? '#fff' : '#60a5fa'} pointerEvents="none" />
      </g>

      {/* D-Pad */}
      <g>
        <rect x="373" y="391.001" width="48" height="48" rx="4" fill={isButtonActive('DpadUp') ? getButtonColor('DpadUp') : '#181822'} stroke={highlightedButton === 'DpadUp' ? '#f59e0b' : (isButtonActive('DpadUp') ? '#00f0ff' : '#4b5563')} strokeWidth="2" onMouseEnter={() => setHoveredButton('DpadUp')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadUp'); }} onMouseDown={() => handleMousePress('DpadUp')} onMouseUp={() => handleMouseRelease('DpadUp')} className="cursor-pointer" />
        <rect x="373" y="479" width="48" height="48" rx="4" fill={isButtonActive('DpadDown') ? getButtonColor('DpadDown') : '#181822'} stroke={highlightedButton === 'DpadDown' ? '#f59e0b' : (isButtonActive('DpadDown') ? '#00f0ff' : '#4b5563')} strokeWidth="2" onMouseEnter={() => setHoveredButton('DpadDown')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadDown'); }} onMouseDown={() => handleMousePress('DpadDown')} onMouseUp={() => handleMouseRelease('DpadDown')} className="cursor-pointer" />
        <rect x="329" y="435" width="48" height="48" rx="4" fill={isButtonActive('DpadLeft') ? getButtonColor('DpadLeft') : '#181822'} stroke={highlightedButton === 'DpadLeft' ? '#f59e0b' : (isButtonActive('DpadLeft') ? '#00f0ff' : '#4b5563')} strokeWidth="2" onMouseEnter={() => setHoveredButton('DpadLeft')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadLeft'); }} onMouseDown={() => handleMousePress('DpadLeft')} onMouseUp={() => handleMouseRelease('DpadLeft')} className="cursor-pointer" />
        <rect x="417.667" y="435" width="48" height="48" rx="4" fill={isButtonActive('DpadRight') ? getButtonColor('DpadRight') : '#181822'} stroke={highlightedButton === 'DpadRight' ? '#f59e0b' : (isButtonActive('DpadRight') ? '#00f0ff' : '#4b5563')} strokeWidth="2" onMouseEnter={() => setHoveredButton('DpadRight')} onMouseLeave={() => { setHoveredButton(null); handleMouseRelease('DpadRight'); }} onMouseDown={() => handleMousePress('DpadRight')} onMouseUp={() => handleMouseRelease('DpadRight')} className="cursor-pointer" />
        <rect x="373" y="435" width="48" height="48" fill="#24242d" stroke="#2d2d38" strokeWidth="1" pointerEvents="none" />
        <polygon points="397,437 393,443 401,443" fill="#6b7280" pointerEvents="none" />
        <polygon points="397,481 393,475 401,475" fill="#6b7280" pointerEvents="none" />
        <polygon points="375,459 381,455 381,463" fill="#6b7280" pointerEvents="none" />
        <polygon points="419,459 413,455 413,463" fill="#6b7280" pointerEvents="none" />
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
              Controller Diagnostics
            </h3>
          </div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
            gamepad.connected 
              ? 'border-brand-green bg-brand-green/5 text-brand-green'
              : 'border-red-500/20 bg-red-500/5 text-red-400'
          }`}>
            {gamepad.connected ? 'LIVE' : 'OFFLINE'}
          </span>
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
                    <div className="h-full bg-brand-cyan" style={{ width: `${ltVal * 100}%` }} />
                  </div>
                </div>

                {/* RT Meter */}
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5 text-[9px]">
                    <span className="font-sans font-bold">RIGHT TRIGGER (RT)</span>
                    <span className="text-brand-cyan">{(rtVal * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan" style={{ width: `${rtVal * 100}%` }} />
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
});
