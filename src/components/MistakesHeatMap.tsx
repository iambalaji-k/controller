import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Award, TrendingUp, Info } from 'lucide-react';
import type { ControllerType } from '../types';

interface MistakesHeatMapProps {
  controllerType: ControllerType;
}

export const MistakesHeatMap: React.FC<MistakesHeatMapProps> = ({ controllerType }) => {
  const { stats } = useApp();
  const [selectedButton, setSelectedButton] = useState<string | null>(null);

  const buttonMistakes = stats.buttonMistakes || {};
  const buttonMastery = stats.buttonMastery || {};

  const BUTTON_POOL = [
    'A', 'B', 'X', 'Y', 
    'LB', 'RB', 'LT', 'RT', 
    'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 
    'LeftStick', 'RightStick',
    'Start', 'Back'
  ];

  // Initialize missing button stats
  BUTTON_POOL.forEach((btn) => {
    if (buttonMistakes[btn] === undefined) buttonMistakes[btn] = 0;
    if (buttonMastery[btn] === undefined) buttonMastery[btn] = 85;
  });

  // Color mapping based on mistake counts
  const getHeatColor = (button: string, opacity: boolean = false) => {
    const mistakes = buttonMistakes[button] || 0;
    if (mistakes === 0) {
      return opacity ? 'rgba(16, 185, 129, 0.15)' : '#10b981'; // green / perfect
    } else if (mistakes <= 2) {
      return opacity ? 'rgba(234, 179, 8, 0.25)' : '#eab308'; // yellow / caution
    } else if (mistakes <= 5) {
      return opacity ? 'rgba(249, 115, 22, 0.4)' : '#f97316'; // orange / warning
    } else {
      return opacity ? 'rgba(239, 68, 68, 0.6)' : '#ef4444'; // red / critical
    }
  };

  const getButtonTextLabel = (btn: string) => {
    if (btn.startsWith('Dpad')) {
      return btn.replace('Dpad', 'D-Pad ');
    }
    if (btn === 'LB') return 'Left Bumper';
    if (btn === 'RB') return 'Right Bumper';
    if (btn === 'LT') return 'Left Trigger';
    if (btn === 'RT') return 'Right Trigger';
    if (btn === 'LeftStick') return 'L-Stick Click';
    if (btn === 'RightStick') return 'R-Stick Click';
    return btn;
  };

  // Find strongest and weakest buttons
  const buttonsSortedByMistakes = [...BUTTON_POOL].sort((a, b) => (buttonMistakes[b] || 0) - (buttonMistakes[a] || 0));
  const buttonsSortedByMastery = [...BUTTON_POOL].sort((a, b) => (buttonMastery[b] || 0) - (buttonMastery[a] || 0));

  const weakestButtons = buttonsSortedByMistakes.filter(btn => (buttonMistakes[btn] || 0) > 0).slice(0, 3);
  const strongestButtons = buttonsSortedByMastery.slice(0, 3);

  // Active button info
  const activeBtn = selectedButton || BUTTON_POOL[0];
  const activeMistakes = buttonMistakes[activeBtn] || 0;
  const activeMastery = buttonMastery[activeBtn] || 85;
  const activeSpawnWeight = 1 + activeMistakes;

  // Render heat controller SVG
  const renderSVGHeatmap = () => {
    const brandColor = controllerType === 'xbox' ? '#10b981' : controllerType === 'playstation' ? '#3b82f6' : '#ef4444';

    return (
      <svg
        viewBox="0 0 600 400"
        className="w-full h-auto select-none max-w-[420px] mx-auto filter drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="heat-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Controller Base Shell */}
        <path
          d="M170 80 C240 70, 360 70, 430 80 C500 90, 550 140, 560 210 C570 280, 520 360, 480 360 C440 360, 410 320, 390 290 C340 270, 260 270, 210 290 C190 320, 160 360, 120 360 C80 360, 30 280, 40 210 C50 140, 100 90, 170 80 Z"
          fill="#131317"
          stroke="#27272a"
          strokeWidth="4"
        />

        {/* Brand Ambient Ring */}
        <path
          d="M170 80 C240 70, 360 70, 430 80 C500 90, 550 140, 560 210 C570 280, 520 360, 480 360 C440 360, 410 320, 390 290 C340 270, 260 270, 210 290 C190 320, 160 360, 120 360 C80 360, 30 280, 40 210 C50 140, 100 90, 170 80 Z"
          stroke={brandColor}
          strokeWidth="1.5"
          strokeOpacity="0.2"
        />

        {/* LEFT TRIGGER (LT) */}
        <g 
          onClick={() => setSelectedButton('LT')} 
          className="cursor-pointer group transition-all"
        >
          <path
            d="M90 65 C95 35, 140 35, 160 50 L150 75 C135 65, 105 65, 100 75 Z"
            fill={getHeatColor('LT', true)}
            stroke={selectedButton === 'LT' ? '#fff' : getHeatColor('LT')}
            strokeWidth={selectedButton === 'LT' ? '2.5' : '1.5'}
          />
          <text x="120" y="55" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">LT</text>
        </g>

        {/* RIGHT TRIGGER (RT) */}
        <g 
          onClick={() => setSelectedButton('RT')} 
          className="cursor-pointer group transition-all"
        >
          <path
            d="M510 65 C505 35, 460 35, 440 50 L450 75 C465 65, 495 65, 500 75 Z"
            fill={getHeatColor('RT', true)}
            stroke={selectedButton === 'RT' ? '#fff' : getHeatColor('RT')}
            strokeWidth={selectedButton === 'RT' ? '2.5' : '1.5'}
          />
          <text x="480" y="55" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">RT</text>
        </g>

        {/* LEFT BUMPER (LB) */}
        <g 
          onClick={() => setSelectedButton('LB')} 
          className="cursor-pointer group transition-all"
        >
          <path
            d="M110 65 C130 50, 190 50, 220 58 L215 72 C190 65, 140 65, 120 75 Z"
            fill={getHeatColor('LB', true)}
            stroke={selectedButton === 'LB' ? '#fff' : getHeatColor('LB')}
            strokeWidth={selectedButton === 'LB' ? '2.5' : '1.5'}
          />
          <text x="165" y="62" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">LB</text>
        </g>

        {/* RIGHT BUMPER (RB) */}
        <g 
          onClick={() => setSelectedButton('RB')} 
          className="cursor-pointer group transition-all"
        >
          <path
            d="M490 65 C470 50, 410 50, 380 58 L385 72 C410 65, 460 65, 480 75 Z"
            fill={getHeatColor('RB', true)}
            stroke={selectedButton === 'RB' ? '#fff' : getHeatColor('RB')}
            strokeWidth={selectedButton === 'RB' ? '2.5' : '1.5'}
          />
          <text x="435" y="62" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">RB</text>
        </g>

        {/* Back / View Button */}
        <g 
          onClick={() => setSelectedButton('Back')} 
          className="cursor-pointer group"
          transform="translate(235, 150)"
        >
          <circle cx="0" cy="0" r="10" fill={getHeatColor('Back', true)} stroke={selectedButton === 'Back' ? '#fff' : getHeatColor('Back')} strokeWidth="1.5" />
          <text x="0" y="3" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">◀</text>
        </g>

        {/* Start / Menu Button */}
        <g 
          onClick={() => setSelectedButton('Start')} 
          className="cursor-pointer group"
          transform="translate(365, 150)"
        >
          <circle cx="0" cy="0" r="10" fill={getHeatColor('Start', true)} stroke={selectedButton === 'Start' ? '#fff' : getHeatColor('Start')} strokeWidth="1.5" />
          <text x="0" y="3.5" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">▶</text>
        </g>

        {/* LEFT ANALOG STICK (L3) */}
        <g 
          onClick={() => setSelectedButton('LeftStick')} 
          className="cursor-pointer group"
          transform={controllerType === 'xbox' || controllerType === 'switch' ? 'translate(160, 160)' : 'translate(220, 240)'}
        >
          <circle cx="0" cy="0" r="32" fill="#181820" stroke="#2d2d38" strokeWidth="2" />
          <circle 
            cx="0" 
            cy="0" 
            r="24" 
            fill={getHeatColor('LeftStick', true)} 
            stroke={selectedButton === 'LeftStick' ? '#fff' : getHeatColor('LeftStick')} 
            strokeWidth={selectedButton === 'LeftStick' ? '2.5' : '1.5'} 
          />
          <text x="0" y="3" fill="#fff" fontSize="8" fontWeight="black" fontFamily="monospace" textAnchor="middle">LS</text>
        </g>

        {/* RIGHT ANALOG STICK (R3) */}
        <g 
          onClick={() => setSelectedButton('RightStick')} 
          className="cursor-pointer group"
          transform="translate(380, 240)"
        >
          <circle cx="0" cy="0" r="32" fill="#181820" stroke="#2d2d38" strokeWidth="2" />
          <circle 
            cx="0" 
            cy="0" 
            r="24" 
            fill={getHeatColor('RightStick', true)} 
            stroke={selectedButton === 'RightStick' ? '#fff' : getHeatColor('RightStick')} 
            strokeWidth={selectedButton === 'RightStick' ? '2.5' : '1.5'} 
          />
          <text x="0" y="3" fill="#fff" fontSize="8" fontWeight="black" fontFamily="monospace" textAnchor="middle">RS</text>
        </g>

        {/* D-PAD BACKGROUND */}
        <g 
          transform={controllerType === 'xbox' || controllerType === 'switch' ? 'translate(220, 240)' : 'translate(160, 160)'}
        >
          <circle cx="0" cy="0" r="36" fill="#18181f" stroke="#2d2d38" strokeWidth="2" />
          
          {/* Dpad Up */}
          <path
            d="M-8 -32 H8 V-12 H-8 Z"
            fill={getHeatColor('DpadUp', true)}
            stroke={selectedButton === 'DpadUp' ? '#fff' : getHeatColor('DpadUp')}
            strokeWidth={selectedButton === 'DpadUp' ? '2' : '1'}
            className="cursor-pointer"
            onClick={() => setSelectedButton('DpadUp')}
          />
          {/* Dpad Down */}
          <path
            d="M-8 12 H8 V32 H-8 Z"
            fill={getHeatColor('DpadDown', true)}
            stroke={selectedButton === 'DpadDown' ? '#fff' : getHeatColor('DpadDown')}
            strokeWidth={selectedButton === 'DpadDown' ? '2' : '1'}
            className="cursor-pointer"
            onClick={() => setSelectedButton('DpadDown')}
          />
          {/* Dpad Left */}
          <path
            d="M-32 -8 H-12 V8 H-32 Z"
            fill={getHeatColor('DpadLeft', true)}
            stroke={selectedButton === 'DpadLeft' ? '#fff' : getHeatColor('DpadLeft')}
            strokeWidth={selectedButton === 'DpadLeft' ? '2' : '1'}
            className="cursor-pointer"
            onClick={() => setSelectedButton('DpadLeft')}
          />
          {/* Dpad Right */}
          <path
            d="M12 -8 H32 V8 H12 Z"
            fill={getHeatColor('DpadRight', true)}
            stroke={selectedButton === 'DpadRight' ? '#fff' : getHeatColor('DpadRight')}
            strokeWidth={selectedButton === 'DpadRight' ? '2' : '1'}
            className="cursor-pointer"
            onClick={() => setSelectedButton('DpadRight')}
          />

          <text x="0" y="3" fill="#6b7280" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">D</text>
        </g>

        {/* FACE BUTTONS */}
        <g transform="translate(440, 160)">
          {/* Button North (Y) */}
          <g 
            onClick={() => setSelectedButton('Y')} 
            className="cursor-pointer group"
            transform="translate(0, -26)"
          >
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={getHeatColor('Y', true)}
              stroke={selectedButton === 'Y' ? '#fff' : getHeatColor('Y')}
              strokeWidth={selectedButton === 'Y' ? '2.5' : '1.5'}
            />
            <text x="0" y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {controllerType === 'playstation' ? '▲' : 'Y'}
            </text>
          </g>

          {/* Button East (B) */}
          <g 
            onClick={() => setSelectedButton('B')} 
            className="cursor-pointer group"
            transform="translate(26, 0)"
          >
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={getHeatColor('B', true)}
              stroke={selectedButton === 'B' ? '#fff' : getHeatColor('B')}
              strokeWidth={selectedButton === 'B' ? '2.5' : '1.5'}
            />
            <text x="0" y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {controllerType === 'playstation' ? '●' : 'B'}
            </text>
          </g>

          {/* Button South (A) */}
          <g 
            onClick={() => setSelectedButton('A')} 
            className="cursor-pointer group"
            transform="translate(0, 26)"
          >
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={getHeatColor('A', true)}
              stroke={selectedButton === 'A' ? '#fff' : getHeatColor('A')}
              strokeWidth={selectedButton === 'A' ? '2.5' : '1.5'}
            />
            <text x="0" y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {controllerType === 'playstation' ? '✖' : 'A'}
            </text>
          </g>

          {/* Button West (X) */}
          <g 
            onClick={() => setSelectedButton('X')} 
            className="cursor-pointer group"
            transform="translate(-26, 0)"
          >
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={getHeatColor('X', true)}
              stroke={selectedButton === 'X' ? '#fff' : getHeatColor('X')}
              strokeWidth={selectedButton === 'X' ? '2.5' : '1.5'}
            />
            <text x="0" y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {controllerType === 'playstation' ? '■' : 'X'}
            </text>
          </g>
        </g>

        {/* Heatmap Legend */}
        <g transform="translate(180, 320)">
          <rect x="0" y="0" width="12" height="12" rx="3" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="1" />
          <text x="18" y="10" fill="#a1a1aa" fontSize="8" fontWeight="bold">0 Mistakes (100%)</text>
          
          <rect x="110" y="0" width="12" height="12" rx="3" fill="rgba(234, 179, 8, 0.3)" stroke="#eab308" strokeWidth="1" />
          <text x="128" y="10" fill="#a1a1aa" fontSize="8" fontWeight="bold">1-2 Mistakes</text>

          <rect x="0" y="20" width="12" height="12" rx="3" fill="rgba(249, 115, 22, 0.4)" stroke="#f97316" strokeWidth="1" />
          <text x="18" y="30" fill="#a1a1aa" fontSize="8" fontWeight="bold">3-5 Mistakes</text>

          <rect x="110" y="20" width="12" height="12" rx="3" fill="rgba(239, 68, 68, 0.6)" stroke="#ef4444" strokeWidth="1" />
          <text x="128" y="30" fill="#a1a1aa" fontSize="8" fontWeight="bold">6+ Mistakes</text>
        </g>
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* SVG Interactive controller heatmap */}
      <div className="lg:col-span-6 flex flex-col justify-center bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl relative">
        <div className="absolute top-3 left-4 flex items-center gap-1.5 text-xs text-zinc-500 font-bold uppercase tracking-wider font-display">
          <Info className="h-3.5 w-3.5 text-brand-cyan" />
          Interactive Calibration Heatmap
        </div>
        <div className="pt-6">
          {renderSVGHeatmap()}
        </div>
        <div className="text-center text-[10px] text-zinc-500 mt-2">
          Click any button on the controller schematic to inspect adaptive learning metrics.
        </div>
      </div>

      {/* Side details panel */}
      <div className="lg:col-span-6 space-y-4">
        {/* Active button telemetry diagnostics */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <h3 className="text-sm font-black font-display text-white uppercase tracking-wider">
              Telemetry details: <span className="text-brand-cyan">{getButtonTextLabel(activeBtn)}</span>
            </h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              activeMistakes === 0 ? 'bg-green-500/10 text-brand-green border border-brand-green/20' :
              activeMistakes <= 2 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {activeMistakes === 0 ? 'Perfect Calibration' : `${activeMistakes} registered mistakes`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-3 rounded-xl flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-display">Mastery Rating</span>
              <span className="text-2xl font-black text-white font-display mt-0.5">{activeMastery}%</span>
              <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 mt-2">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    activeMastery >= 90 ? 'bg-brand-green' : activeMastery >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${activeMastery}%` }}
                />
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/60 p-3 rounded-xl flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-zinc-500 font-display">Spawn Weight Multiplier</span>
              <span className="text-2xl font-black text-brand-purple font-display mt-0.5">{activeSpawnWeight.toFixed(1)}x</span>
              <span className="text-[8px] text-zinc-500 leading-none mt-1">Relative frequency in future drills</span>
            </div>
          </div>

          {/* Adaptive Learning Mechanism Box */}
          <div className="p-3 bg-brand-purple/5 border border-brand-purple/20 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-purple uppercase tracking-wider font-display">
              <TrendingUp className="h-4 w-4" />
              Adaptive Learning Core
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              {activeMistakes > 0 ? (
                <>
                  Due to {activeMistakes} registered mistakes on this button, the system is actively prioritizing it in future exercises. It will appear <strong className="text-brand-purple">{activeSpawnWeight}x</strong> more frequently until you complete drills successfully without mistakes, lowering its weight and building stable muscle memory.
                </>
              ) : (
                <>
                  This button has a perfect record. Its weight is at the baseline level. The system will favor other buttons that require calibration, but will periodically prompt this button to ensure your mechanics remain sharp.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Strengths and Weaknesses lists */}
        <div className="grid grid-cols-2 gap-4">
          {/* Strongest Buttons (Highest Mastery) */}
          <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-2.5 text-left">
            <h4 className="text-[11px] font-bold uppercase tracking-wider font-display text-brand-green flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Top Strongest Buttons
            </h4>
            <div className="space-y-1.5">
              {strongestButtons.map((btn) => (
                <div 
                  key={btn} 
                  onClick={() => setSelectedButton(btn)}
                  className={`flex items-center justify-between p-2 rounded-lg border border-zinc-800/50 bg-zinc-950/20 text-xs hover:border-zinc-700 cursor-pointer ${
                    activeBtn === btn ? 'border-brand-green bg-brand-green/5' : ''
                  }`}
                >
                  <span className="font-extrabold text-zinc-300 font-display">{getButtonTextLabel(btn)}</span>
                  <span className="font-bold text-brand-green font-mono">{buttonMastery[btn]}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weakest Buttons (Most Mistakes) */}
          <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-2.5 text-left">
            <h4 className="text-[11px] font-bold uppercase tracking-wider font-display text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Top Weakest Buttons
            </h4>
            <div className="space-y-1.5">
              {weakestButtons.length === 0 ? (
                <div className="p-3 text-[10px] text-zinc-500 bg-zinc-900/10 border border-zinc-800/40 rounded-lg text-center">
                  Perfect calibration! No mistakes logged.
                </div>
              ) : (
                weakestButtons.map((btn) => (
                  <div 
                    key={btn} 
                    onClick={() => setSelectedButton(btn)}
                    className={`flex items-center justify-between p-2 rounded-lg border border-zinc-800/50 bg-zinc-950/20 text-xs hover:border-zinc-700 cursor-pointer ${
                      activeBtn === btn ? 'border-red-500 bg-red-500/5' : ''
                    }`}
                  >
                    <span className="font-extrabold text-zinc-300 font-display">{getButtonTextLabel(btn)}</span>
                    <span className="font-bold text-red-400 font-mono">+{buttonMistakes[btn]} Miss</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
