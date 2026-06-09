import React from 'react';
import type { ControllerType } from '../types';

interface ControllerSvgProps {
  type: ControllerType;
  activePart?: 'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null;
  className?: string;
}

export const ControllerSvg: React.FC<ControllerSvgProps> = ({
  type,
  activePart = null,
  className = '',
}) => {
  // Theme colors based on controller type
  const getBrandColor = () => {
    switch (type) {
      case 'xbox': return '#10b981'; // Emerald Green
      case 'playstation': return '#3b82f6'; // PlayStation Blue
      case 'switch': return '#ef4444'; // Switch Neon Red
      default: return '#8b5cf6';
    }
  };

  const brandColor = getBrandColor();

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
        {/* Gradients */}
        <linearGradient id="controller-body" x1="300" y1="50" x2="300" y2="350" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e1e24" />
          <stop offset="0.5" stopColor="#141418" />
          <stop offset="1" stopColor="#0c0c0e" />
        </linearGradient>
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
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />

      {/* Main Body */}
      <path
        d="M170 80 C240 70, 360 70, 430 80 C500 90, 550 140, 560 210 C570 280, 520 360, 480 360 C440 360, 410 320, 390 290 C340 270, 260 270, 210 290 C190 320, 160 360, 120 360 C80 360, 30 280, 40 210 C50 140, 100 90, 170 80 Z"
        fill="url(#controller-body)"
        stroke="#2d2d37"
        strokeWidth="4"
      />

      {/* Left Grip Texture */}
      <path
        d="M45 200 C40 250, 60 310, 100 345 C115 355, 128 350, 125 330 C110 290, 95 240, 90 200 C90 190, 50 190, 45 200 Z"
        fill="url(#grip-left)"
        opacity="0.8"
      />

      {/* Right Grip Texture */}
      <path
        d="M555 200 C560 250, 540 310, 500 345 C485 355, 472 350, 475 330 C490 290, 505 240, 510 200 C510 190, 550 190, 555 200 Z"
        fill="url(#grip-right)"
        opacity="0.8"
      />

      {/* Logo/Center Area (Vents / Light bar) */}
      <g transform="translate(260, 85)">
        {/* Stylized Logo housing */}
        <path d="M10 5 H70 L60 35 H20 Z" fill="#18181c" stroke="#2a2a35" strokeWidth="2" />
        {/* Glow Bar */}
        <rect
          x="25"
          y="12"
          width="30"
          height="8"
          rx="4"
          fill={brandColor}
          filter={activePart ? 'url(#glow-brand)' : 'none'}
          className="transition-all duration-300"
          style={{ fill: brandColor }}
        />
        {/* Tiny vents */}
        <line x1="20" y1="28" x2="60" y2="28" stroke="#3a3a4c" strokeWidth="2" strokeDasharray="4 3" />
      </g>

      {/* Bumpers & Triggers (Rear top indicators) */}
      {/* Left Trigger (LT/L2) */}
      <g transform="translate(90, 30)" className="transition-all duration-300">
        <path
          d="M10 35 C15 5, 60 5, 80 20 L70 45 C55 35, 25 35, 20 45 Z"
          fill={activePart === 'triggers' ? brandColor : '#1f1f26'}
          stroke={activePart === 'triggers' ? brandColor : '#3f3f4f'}
          strokeWidth="2"
          filter={activePart === 'triggers' ? 'url(#glow-brand)' : 'none'}
        />
        <text x="35" y="25" fill={activePart === 'triggers' ? '#fff' : '#6b7280'} fontSize="11" fontWeight="bold" fontFamily="monospace">L2</text>
      </g>
      
      {/* Right Trigger (RT/R2) */}
      <g transform="translate(430, 30)" className="transition-all duration-300">
        <path
          d="M90 35 C85 5, 40 5, 20 20 L30 45 C45 35, 75 35, 80 45 Z"
          fill={activePart === 'triggers' ? brandColor : '#1f1f26'}
          stroke={activePart === 'triggers' ? brandColor : '#3f3f4f'}
          strokeWidth="2"
          filter={activePart === 'triggers' ? 'url(#glow-brand)' : 'none'}
        />
        <text x="50" y="25" fill={activePart === 'triggers' ? '#fff' : '#6b7280'} fontSize="11" fontWeight="bold" fontFamily="monospace">R2</text>
      </g>

      {/* Left Bumper (LB/L1) */}
      <path
        d="M110 65 C130 50, 190 50, 220 58 L215 72 C190 65, 140 65, 120 75 Z"
        fill={activePart === 'triggers' ? brandColor : '#2b2b35'}
        stroke="#3f3f50"
        strokeWidth="1.5"
        className="transition-all duration-300"
      />

      {/* Right Bumper (RB/R1) */}
      <path
        d="M490 65 C470 50, 410 50, 380 58 L385 72 C410 65, 460 65, 480 75 Z"
        fill={activePart === 'triggers' ? brandColor : '#2b2b35'}
        stroke="#3f3f50"
        strokeWidth="1.5"
        className="transition-all duration-300"
      />

      {/* Left Analog Stick - Xbox layout (top-left) vs PS layout (bottom-left) */}
      {/* Xbox Layout: Left Stick is Top Left, D-Pad is Bottom Left */}
      {/* PlayStation Layout: Both sticks are at bottom-center */}
      <g
        transform={type === 'xbox' || type === 'switch' ? 'translate(160, 160)' : 'translate(220, 240)'}
        className="transition-all duration-300"
      >
        <circle cx="0" cy="0" r="45" fill="#141417" stroke="#2d2d38" strokeWidth="3" />
        <circle cx="0" cy="0" r="38" fill="#1a1a20" stroke="#3c3c4e" strokeWidth="1" />
        
        {/* Animated Inner Thumbstick */}
        <g transform={activePart === 'left-stick' ? 'translate(-8, -12)' : 'translate(0, 0)'} className="transition-all duration-300">
          <circle
            cx="0"
            cy="0"
            r="30"
            fill="#262630"
            stroke={activePart === 'left-stick' ? brandColor : '#4b5563'}
            strokeWidth="3.5"
            filter={activePart === 'left-stick' ? 'url(#glow-brand)' : 'none'}
          />
          {/* Thumb grip textures */}
          <line x1="-8" y1="0" x2="8" y2="0" stroke={activePart === 'left-stick' ? brandColor : '#555'} strokeWidth="2.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke={activePart === 'left-stick' ? brandColor : '#555'} strokeWidth="2.5" />
          <circle cx="0" cy="0" r="16" fill="none" stroke={activePart === 'left-stick' ? brandColor : '#3c3c4e'} strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      </g>

      {/* Right Analog Stick (Always Bottom Right) */}
      <g transform="translate(380, 240)" className="transition-all duration-300">
        <circle cx="0" cy="0" r="45" fill="#141417" stroke="#2d2d38" strokeWidth="3" />
        <circle cx="0" cy="0" r="38" fill="#1a1a20" stroke="#3c3c4e" strokeWidth="1" />
        
        {/* Animated Inner Thumbstick */}
        <g transform={activePart === 'right-stick' ? 'translate(12, 6)' : 'translate(0, 0)'} className="transition-all duration-300">
          <circle
            cx="0"
            cy="0"
            r="30"
            fill="#262630"
            stroke={activePart === 'right-stick' ? brandColor : '#4b5563'}
            strokeWidth="3.5"
            filter={activePart === 'right-stick' ? 'url(#glow-brand)' : 'none'}
          />
          {/* Thumb grip textures */}
          <line x1="-8" y1="0" x2="8" y2="0" stroke={activePart === 'right-stick' ? brandColor : '#555'} strokeWidth="2.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke={activePart === 'right-stick' ? brandColor : '#555'} strokeWidth="2.5" />
          <circle cx="0" cy="0" r="16" fill="none" stroke={activePart === 'right-stick' ? brandColor : '#3c3c4e'} strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      </g>

      {/* D-PAD */}
      {/* Xbox Layout: D-Pad is Bottom Left (220, 240) */}
      {/* PS Layout: D-Pad is Top Left (160, 160) */}
      <g
        transform={type === 'xbox' || type === 'switch' ? 'translate(220, 240)' : 'translate(160, 160)'}
        className="transition-all duration-300"
      >
        {/* Dpad Backing Circle */}
        <circle cx="0" cy="0" r="40" fill="#18181f" stroke="#2d2d38" strokeWidth="2" />
        
        {/* Cross Path */}
        <path
          d="M-12 -34 H12 V-12 H34 V12 H12 V34 H-12 V12 H-34 V-12 H-12 Z"
          fill={activePart === 'dpad' ? brandColor : '#24242d'}
          stroke="#4b5563"
          strokeWidth="2"
          filter={activePart === 'dpad' ? 'url(#glow-brand)' : 'none'}
          className="transition-all duration-300"
        />
        {/* Accent lines */}
        <path d="M0 -30 L0 -15" stroke={activePart === 'dpad' ? '#fff' : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M0 30 L0 15" stroke={activePart === 'dpad' ? '#fff' : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M-30 0 L-15 0" stroke={activePart === 'dpad' ? '#fff' : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 0 L15 0" stroke={activePart === 'dpad' ? '#fff' : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Face Buttons Area (X, Y, A, B or Triangle, Circle, Cross, Square) */}
      <g transform="translate(440, 160)">
        <circle cx="0" cy="0" r="45" fill="#16161d" opacity="0.3" />
        
        {/* Button North (Y or Triangle) */}
        <g transform="translate(0, -28)" className="transition-all duration-200">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={activePart === 'buttons' ? brandColor : '#22222a'}
            stroke="#4b5563"
            strokeWidth="1.5"
            filter={activePart === 'buttons' ? 'url(#glow-brand)' : 'none'}
          />
          <text x="0" y="4.5" textAnchor="middle" fill={activePart === 'buttons' ? '#fff' : '#a1a1aa'} fontSize="13" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '▲' : 'Y'}
          </text>
        </g>
        
        {/* Button East (B or Circle) */}
        <g transform="translate(28, 0)" className="transition-all duration-200">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={activePart === 'buttons' ? brandColor : '#22222a'}
            stroke="#4b5563"
            strokeWidth="1.5"
            filter={activePart === 'buttons' ? 'url(#glow-brand)' : 'none'}
          />
          <text x="0" y="4.5" textAnchor="middle" fill={activePart === 'buttons' ? '#fff' : '#a1a1aa'} fontSize="13" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '●' : 'B'}
          </text>
        </g>

        {/* Button South (A or Cross) */}
        <g transform="translate(0, 28)" className="transition-all duration-200">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={activePart === 'buttons' ? brandColor : '#22222a'}
            stroke="#4b5563"
            strokeWidth="1.5"
            filter={activePart === 'buttons' ? 'url(#glow-brand)' : 'none'}
          />
          <text x="0" y="4" textAnchor="middle" fill={activePart === 'buttons' ? '#fff' : '#a1a1aa'} fontSize="13" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '✖' : 'A'}
          </text>
        </g>

        {/* Button West (X or Square) */}
        <g transform="translate(-28, 0)" className="transition-all duration-200">
          <circle
            cx="0"
            cy="0"
            r="13"
            fill={activePart === 'buttons' ? brandColor : '#22222a'}
            stroke="#4b5563"
            strokeWidth="1.5"
            filter={activePart === 'buttons' ? 'url(#glow-brand)' : 'none'}
          />
          <text x="0" y="4.5" textAnchor="middle" fill={activePart === 'buttons' ? '#fff' : '#a1a1aa'} fontSize="12" fontWeight="bold" fontFamily="monospace">
            {type === 'playstation' ? '■' : 'X'}
          </text>
        </g>
      </g>

      {/* Menu / Options buttons */}
      {/* Options Left */}
      <path
        d="M235 155 L245 145"
        stroke="#4b5563"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Options Right */}
      <path
        d="M365 155 L355 145"
        stroke="#4b5563"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
