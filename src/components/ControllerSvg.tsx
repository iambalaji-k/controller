import React from 'react';
import type { ControllerType } from '../types';
import { useApp } from '../context/AppContext';

interface ControllerSvgProps {
  type: ControllerType;
  activePart?: 'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null;
  className?: string;
  heatmapMode?: 'none' | 'mistakes' | 'speed' | 'practice';
  pressedButtons?: Record<string, boolean>;
  leftStickCoords?: { x: number; y: number };
  rightStickCoords?: { x: number; y: number };
  triggerValues?: { lt: number; rt: number };
}

export const ControllerSvg: React.FC<ControllerSvgProps> = React.memo(({
  type,
  activePart = null,
  className = '',
  heatmapMode = 'none',
  pressedButtons = {},
  leftStickCoords = { x: 0, y: 0 },
  rightStickCoords = { x: 0, y: 0 },
  triggerValues = { lt: 0, rt: 0 },
}) => {
  const { profile, stats } = useApp();
  const selectedSkin = profile.selectedSkin || 'standard';

  // Base brand colors
  const getBrandColor = () => {
    if (selectedSkin === 'carbon') return '#ff3b30'; // Sleek Red line accent
    if (selectedSkin === 'gold') return '#fbbf24'; // Luxury Gold glow
    if (selectedSkin === 'cyberpunk') return '#00f0ff'; // Cyberpunk Neon Cyan
    
    switch (type) {
      case 'xbox': return '#10b981'; // Emerald Green
      case 'playstation': return '#3b82f6'; // PlayStation Blue
      case 'switch': return '#ef4444'; // Switch Neon Red
      default: return '#8b5cf6';
    }
  };

  const brandColor = getBrandColor();

  // Helper function to color code heatmap buttons
  const getHeatmapColor = (btn: string, defaultColor: string) => {
    if (heatmapMode === 'none') return defaultColor;

    if (heatmapMode === 'mistakes') {
      const misses = stats.buttonMistakes?.[btn] || 0;
      if (misses === 0) return '#1f2937'; // slate-800
      if (misses < 3) return '#b91c1c'; // light red
      return '#ef4444'; // glowing red
    }

    if (heatmapMode === 'speed') {
      const speed = stats.buttonReactionTimes?.[btn] || 0;
      if (speed === 0) return '#1f2937';
      if (speed <= 210) return '#059669'; // fast green
      if (speed <= 260) return '#d97706'; // intermediate orange
      return '#dc2626'; // slow red
    }

    if (heatmapMode === 'practice') {
      const count = stats.buttonPracticeCounts?.[btn] || 0;
      if (count === 0) return '#1f2937';
      if (count < 5) return '#6d28d9'; // light purple
      if (count < 15) return '#8b5cf6'; // purple
      return '#00f0ff'; // max cyan
    }

    return defaultColor;
  };

  // Helper function for active button highlights
  const getButtonFill = (btn: string, defaultColor: string) => {
    if (heatmapMode !== 'none') {
      return getHeatmapColor(btn, defaultColor);
    }
    const isPressed = pressedButtons[btn] || false;
    
    if (selectedSkin === 'standard') {
      if (btn === 'A') return isPressed ? '#10b981' : '#047857'; // Green
      if (btn === 'B') return isPressed ? '#ef4444' : '#b91c1c'; // Red
      if (btn === 'X') return isPressed ? '#3b82f6' : '#1d4ed8'; // Blue
      if (btn === 'Y') return isPressed ? '#eab308' : '#a16207'; // Yellow
    }

    if (isPressed) {
      return brandColor; // active skin highlight
    }
    return defaultColor;
  };

  const getButtonFillGeneral = (btn: string, defaultColor: string) => {
    if (heatmapMode !== 'none') {
      return getHeatmapColor(btn, defaultColor);
    }
    const isPressed = pressedButtons[btn] || false;
    if (isPressed) {
      return brandColor;
    }
    return defaultColor;
  };

  // Evaluate D-Pad colors
  const isDpadUpActive = pressedButtons.DpadUp || activePart === 'dpad';
  const isDpadDownActive = pressedButtons.DpadDown || activePart === 'dpad';
  const isDpadLeftActive = pressedButtons.DpadLeft || activePart === 'dpad';
  const isDpadRightActive = pressedButtons.DpadRight || activePart === 'dpad';

  return (
    <svg
      viewBox="0 0 600 400"
      className={`w-full h-auto select-none drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="glow-brand" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-neon" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        {/* Carbon texture pattern */}
        <pattern id="carbon-texture" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#131317" />
          <polygon points="0,0 4,0 0,4" fill="#1c1c22" />
          <polygon points="4,4 8,4 4,8" fill="#1c1c22" />
          <polygon points="4,4 4,0 8,0" fill="#18181e" />
          <polygon points="0,4 0,8 4,8" fill="#18181e" />
        </pattern>

        {/* Skins Body Gradients */}
        {selectedSkin === 'standard' && (
          <linearGradient id="controller-body" x1="300" y1="50" x2="300" y2="350" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1c1c22" />
            <stop offset="0.5" stopColor="#121215" />
            <stop offset="1" stopColor="#08080a" />
          </linearGradient>
        )}

        {selectedSkin === 'carbon' && (
          <linearGradient id="controller-body" x1="300" y1="50" x2="300" y2="350" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0d0d0f" />
            <stop offset="0.5" stopColor="#15151b" />
            <stop offset="1" stopColor="#050507" />
          </linearGradient>
        )}

        {selectedSkin === 'gold' && (
          <linearGradient id="controller-body" x1="300" y1="50" x2="300" y2="350" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="0.5" stopColor="#d97706" />
            <stop offset="1" stopColor="#78350f" />
          </linearGradient>
        )}

        {selectedSkin === 'cyberpunk' && (
          <linearGradient id="controller-body" x1="300" y1="50" x2="300" y2="350" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff007f" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#00f0ff" />
          </linearGradient>
        )}

        <linearGradient id="grip-left" x1="80" y1="180" x2="160" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2e2e38" />
          <stop offset="1" stopColor="#0d0d0f" />
        </linearGradient>
        <linearGradient id="grip-right" x1="520" y1="180" x2="440" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2e2e38" />
          <stop offset="1" stopColor="#0d0d0f" />
        </linearGradient>
      </defs>

      {/* Controller Outer Shell Outline (Glowing Edge) */}
      <path
        d="M170 80 C240 70, 360 70, 430 80 C500 90, 550 140, 560 210 C570 280, 520 360, 480 360 C440 360, 410 320, 390 290 C340 270, 260 270, 210 290 C190 320, 160 360, 120 360 C80 360, 30 280, 40 210 C50 140, 100 90, 170 80 Z"
        stroke={brandColor}
        strokeWidth="2"
        strokeOpacity="0.4"
        filter="url(#glow-brand)"
      />

      {/* Main Body */}
      <path
        d="M170 80 C240 70, 360 70, 430 80 C500 90, 550 140, 560 210 C570 280, 520 360, 480 360 C440 360, 410 320, 390 290 C340 270, 260 270, 210 290 C190 320, 160 360, 120 360 C80 360, 30 280, 40 210 C50 140, 100 90, 170 80 Z"
        fill="url(#controller-body)"
        stroke={selectedSkin === 'cyberpunk' ? '#00f0ff' : '#2d2d37'}
        strokeWidth="3.5"
      />

      {/* Carbon fiber overlay if selected */}
      {selectedSkin === 'carbon' && (
        <path
          d="M170 80 C240 70, 360 70, 430 80 C500 90, 550 140, 560 210 C570 280, 520 360, 480 360 C440 360, 410 320, 390 290 C340 270, 260 270, 210 290 C190 320, 160 360, 120 360 C80 360, 30 280, 40 210 C50 140, 100 90, 170 80 Z"
          fill="url(#carbon-texture)"
          opacity="0.3"
          pointerEvents="none"
        />
      )}

      {/* Left Grip Texture */}
      <path
        d="M45 200 C40 250, 60 310, 100 345 C115 355, 128 350, 125 330 C110 290, 95 240, 90 200 C90 190, 50 190, 45 200 Z"
        fill="url(#grip-left)"
        opacity="0.75"
      />

      {/* Right Grip Texture */}
      <path
        d="M555 200 C560 250, 540 310, 500 345 C485 355, 472 350, 475 330 C490 290, 505 240, 510 200 C510 190, 550 190, 555 200 Z"
        fill="url(#grip-right)"
        opacity="0.75"
      />

      {/* Logo/Center Area (Vents / Light bar) */}
      <g transform="translate(260, 85)">
        <path d="M10 5 H70 L60 35 H20 Z" fill="#18181c" stroke="#2a2a35" strokeWidth="2" />
        <rect
          x="25"
          y="12"
          width="30"
          height="8"
          rx="4"
          fill={getButtonFillGeneral('Guide', brandColor)}
          filter={pressedButtons.Guide ? "url(#glow-brand)" : undefined}
          className="transition-all duration-75"
        />
      </g>

      {/* Bumpers & Triggers */}
      {/* Left Trigger (LT) */}
      <g transform="translate(90, 30)">
        <path
          d="M10 35 C15 5, 60 5, 80 20 L70 45 C55 35, 25 35, 20 45 Z"
          fill={triggerValues.lt > 0 ? brandColor : getButtonFillGeneral('LT', activePart === 'triggers' ? brandColor : '#1f1f26')}
          fillOpacity={triggerValues.lt > 0 ? 0.3 + triggerValues.lt * 0.7 : 1}
          stroke={activePart === 'triggers' || triggerValues.lt > 0 ? brandColor : '#3f3f4f'}
          strokeWidth="2"
        />
        <text x="35" y="25" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="monospace">LT</text>
      </g>
      
      {/* Right Trigger (RT) */}
      <g transform="translate(430, 30)">
        <path
          d="M90 35 C85 5, 40 5, 20 20 L30 45 C45 35, 75 35, 80 45 Z"
          fill={triggerValues.rt > 0 ? brandColor : getButtonFillGeneral('RT', activePart === 'triggers' ? brandColor : '#1f1f26')}
          fillOpacity={triggerValues.rt > 0 ? 0.3 + triggerValues.rt * 0.7 : 1}
          stroke={activePart === 'triggers' || triggerValues.rt > 0 ? brandColor : '#3f3f4f'}
          strokeWidth="2"
        />
        <text x="50" y="25" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="monospace">RT</text>
      </g>

      {/* Left Bumper (LB) */}
      <path
        d="M110 65 C130 50, 190 50, 220 58 L215 72 C190 65, 140 65, 120 75 Z"
        fill={getButtonFillGeneral('LB', activePart === 'triggers' ? brandColor : '#2b2b35')}
        stroke={pressedButtons.LB ? brandColor : '#3f3f50'}
        strokeWidth="1.5"
      />

      {/* Right Bumper (RB) */}
      <path
        d="M490 65 C470 50, 410 50, 380 58 L385 72 C410 65, 460 65, 480 75 Z"
        fill={getButtonFillGeneral('RB', activePart === 'triggers' ? brandColor : '#2b2b35')}
        stroke={pressedButtons.RB ? brandColor : '#3f3f50'}
        strokeWidth="1.5"
      />

      {/* Left Analog Stick */}
      <g
        transform={type === 'xbox' || type === 'switch' ? 'translate(160, 160)' : 'translate(220, 240)'}
      >
        <circle cx="0" cy="0" r="45" fill={getHeatmapColor('LeftStick', '#141417')} stroke="#2d2d38" strokeWidth="3" />
        <circle cx="0" cy="0" r="38" fill="#1a1a20" stroke="#3c3c4e" strokeWidth="1" />
        
          <g 
            transform={
              leftStickCoords.x !== 0 || leftStickCoords.y !== 0
                ? `translate(${leftStickCoords.x * 12}, ${leftStickCoords.y * 12})`
                : activePart === 'left-stick'
                ? 'translate(-8, -12)'
                : 'translate(0, 0)'
            }
          >
          <circle
            cx="0"
            cy="0"
            r="30"
            fill={getButtonFillGeneral('L3', '#262630')}
            stroke={activePart === 'left-stick' || pressedButtons.L3 ? brandColor : '#4b5563'}
            strokeWidth="3.5"
          />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#555" strokeWidth="2.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#555" strokeWidth="2.5" />
        </g>
      </g>

      {/* Right Analog Stick */}
      <g transform="translate(380, 240)">
        <circle cx="0" cy="0" r="45" fill={getHeatmapColor('RightStick', '#141417')} stroke="#2d2d38" strokeWidth="3" />
        <circle cx="0" cy="0" r="38" fill="#1a1a20" stroke="#3c3c4e" strokeWidth="1" />
        
          <g 
            transform={
              rightStickCoords.x !== 0 || rightStickCoords.y !== 0
                ? `translate(${rightStickCoords.x * 12}, ${rightStickCoords.y * 12})`
                : activePart === 'right-stick'
                ? 'translate(12, 6)'
                : 'translate(0, 0)'
            }
          >
          <circle
            cx="0"
            cy="0"
            r="30"
            fill={getButtonFillGeneral('R3', '#262630')}
            stroke={activePart === 'right-stick' || pressedButtons.R3 ? brandColor : '#4b5563'}
            strokeWidth="3.5"
          />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#555" strokeWidth="2.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#555" strokeWidth="2.5" />
        </g>
      </g>

      {/* D-PAD */}
      <g
        transform={type === 'xbox' || type === 'switch' ? 'translate(220, 240)' : 'translate(160, 160)'}
      >
        <circle cx="0" cy="0" r="40" fill="#18181f" stroke="#2d2d38" strokeWidth="2" />
        
        {/* D-Pad background shape */}
        <path
          d="M-12 -34 H12 V-12 H34 V12 H12 V34 H-12 V12 H-34 V-12 H-12 Z"
          fill="#24242d"
          stroke="#4b5563"
          strokeWidth="2"
        />

        {/* Up direction highlight */}
        <path
          d="M-12 -34 H12 V-12 H-12 Z"
          fill={isDpadUpActive ? getButtonFillGeneral('DpadUp', brandColor) : 'transparent'}
        />
        {/* Down direction highlight */}
        <path
          d="M-12 12 H12 V34 H-12 Z"
          fill={isDpadDownActive ? getButtonFillGeneral('DpadDown', brandColor) : 'transparent'}
        />
        {/* Left direction highlight */}
        <path
          d="M-34 -12 H-12 V12 H-34 Z"
          fill={isDpadLeftActive ? getButtonFillGeneral('DpadLeft', brandColor) : 'transparent'}
        />
        {/* Right direction highlight */}
        <path
          d="M12 -12 H34 V12 H12 Z"
          fill={isDpadRightActive ? getButtonFillGeneral('DpadRight', brandColor) : 'transparent'}
        />

        {/* Re-render grid lines and indicators for high contrast */}
        <path
          d="M-12 -34 H12 V-12 H34 V12 H12 V34 H-12 V12 H-34 V-12 H-12 Z"
          fill="none"
          stroke="#4b5563"
          strokeWidth="2"
        />
        <path d="M0 -30 L0 -15" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M0 30 L0 15" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M-30 0 L-15 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 0 L15 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Face Buttons Area */}
      <g transform="translate(440, 160)">
        <circle cx="0" cy="0" r="45" fill="#16161d" opacity="0.3" />
        
        {/* Button North (Y) */}
        <g transform="translate(0, -28)">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonFill('Y', '#22222a')}
            stroke={pressedButtons.Y ? brandColor : '#4b5563'}
            strokeWidth="1.5"
            className="transition-all duration-75"
          />
          <text x="0" y="4.5" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '▲' : 'Y'}
          </text>
        </g>
        
        {/* Button East (B) */}
        <g transform="translate(28, 0)">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonFill('B', '#22222a')}
            stroke={pressedButtons.B ? brandColor : '#4b5563'}
            strokeWidth="1.5"
            className="transition-all duration-75"
          />
          <text x="0" y="4.5" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '●' : 'B'}
          </text>
        </g>

        {/* Button South (A) */}
        <g transform="translate(0, 28)">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonFill('A', '#22222a')}
            stroke={pressedButtons.A ? brandColor : '#4b5563'}
            strokeWidth="1.5"
            className="transition-all duration-75"
          />
          <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '✖' : 'A'}
          </text>
        </g>

        {/* Button West (X) */}
        <g transform="translate(-28, 0)">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={getButtonFill('X', '#22222a')}
            stroke={pressedButtons.X ? brandColor : '#4b5563'}
            strokeWidth="1.5"
            className="transition-all duration-75"
          />
          <text x="0" y="4.5" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '■' : 'X'}
          </text>
        </g>
      </g>

      {/* Menu / Options buttons */}
      <path
        d="M235 155 L245 145"
        stroke={getButtonFillGeneral('Back', '#4b5563')}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M365 155 L355 145"
        stroke={getButtonFillGeneral('Start', '#4b5563')}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
});
