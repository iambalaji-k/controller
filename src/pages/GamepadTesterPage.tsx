import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useGamepad } from '../hooks/useGamepad';
import { ControllerSvg } from '../components/ControllerSvg';
import { triggerGamepadVibration } from '../utils/vibration';
import { Gamepad2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  name: string;
  timestamp: string;
}

const StickVisualizer: React.FC<{
  title: string;
  x: number;
  y: number;
}> = React.memo(({ title, x, y }) => {
  const size = 120;
  const radius = size / 2;
  // Translate coordinate from [-1, 1] to pixel offsets
  const dotX = radius + x * (radius - 12);
  const dotY = radius + y * (radius - 12);

  return (
    <div className="bg-zinc-900/40 border border-zinc-900/80 p-4 rounded-2xl flex flex-col items-center space-y-3">
      <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 font-display">
        {title}
      </span>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Crosshair circular grid */}
        <div className="absolute inset-0 rounded-full border border-zinc-800 bg-zinc-950/80" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-800/40" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-800/40" />
        {/* Inner concentric ring */}
        <div className="absolute inset-6 rounded-full border border-zinc-900/60" />
        
        {/* Coordinate dot */}
        <div 
          className="absolute h-4 w-4 bg-brand-cyan rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-brand-cyan/80"
          style={{ left: dotX, top: dotY }}
        />
      </div>
      <div className="flex gap-4 text-[10px] font-mono text-zinc-400">
        <span>X: {x.toFixed(3)}</span>
        <span>Y: {y.toFixed(3)}</span>
      </div>
    </div>
  );
});

const TriggerBar: React.FC<{
  label: string;
  val: number;
}> = React.memo(({ label, val }) => {
  const percent = Math.round(val * 100);
  const filledBars = Math.round(val * 10);
  const emptyBars = 10 - filledBars;
  const asciiBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

  return (
    <div className="space-y-1 text-left">
      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
        <span className="font-sans font-bold text-zinc-500 uppercase">{label}</span>
        <span className="text-brand-cyan font-bold">{asciiBar} {percent}%</span>
      </div>
      <div className="h-3 w-full bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden">
        <div 
          className="h-full bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.4)]" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
});

export const GamepadTesterPage: React.FC = () => {
  const { profile, updateProfile, vibrationIntensity, vibrationEnabled } = useApp();
  const gamepad = useGamepad();

  const [pressedHistory, setPressedHistory] = useState<HistoryItem[]>([]);
  const prevButtons = useRef<Record<string, boolean>>({});

  // Monitor physical button presses for history logging
  useEffect(() => {
    if (gamepad.connected) {
      Object.keys(gamepad.buttons).forEach((key) => {
        const wasPressed = prevButtons.current[key];
        const isPressed = gamepad.buttons[key];
        if (isPressed && !wasPressed) {
          const newItem: HistoryItem = {
            id: Math.random().toString(),
            name: key,
            timestamp: new Date().toLocaleTimeString(undefined, { hour12: false, fractionSecondDigits: 3 } as any),
          };
          setPressedHistory((prev) => [newItem, ...prev.slice(0, 14)]);
        }
      });
      prevButtons.current = { ...gamepad.buttons };
    }
  }, [gamepad.buttons, gamepad.connected]);

  const handleTestVibration = (pattern: 'correct' | 'incorrect' | 'combo' | 'levelup') => {
    triggerGamepadVibration(pattern, vibrationIntensity, vibrationEnabled);
  };

  const ALL_BUTTONS = [
    'A', 'B', 'X', 'Y',
    'LB', 'RB', 'LT', 'RT',
    'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight',
    'L3', 'R3', 'Start', 'Back', 'Guide'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <section className="text-left space-y-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight flex items-center gap-2">
            <Gamepad2 className="h-7 w-7 text-brand-cyan" />
            Gamepad Hardware Tester
          </h1>
          <p className="text-xs md:text-sm text-zinc-400">
            Real-time visual telemetry inspector and diagnostics utility for physical gamepads.
          </p>
        </div>

        {/* Layout override controller selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 font-display">
            Device Layout:
          </span>
          <select
            value={profile.controllerType}
            onChange={(e) => updateProfile({ controllerType: e.target.value as any })}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold py-1.5 px-3 rounded-xl cursor-pointer focus:outline-none focus:border-brand-cyan"
          >
            <option value="xbox">Xbox Layout</option>
            <option value="playstation">PlayStation Layout</option>
            <option value="switch">Switch Layout</option>
          </select>
        </div>
      </section>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Display Area (Controller Visualizer) - 7 columns */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 left-0 w-80 h-80 bg-brand-cyan/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Hardware Link Banner */}
            <div className="w-full flex justify-between items-center border-b border-zinc-900 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${gamepad.connected ? 'bg-brand-green animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                <span className="text-xs font-bold text-zinc-300 font-display uppercase tracking-wider">
                  {gamepad.connected ? 'Controller Connected' : 'No Controller Detected'}
                </span>
              </div>
              {gamepad.connected && (
                <span className="text-[10px] text-zinc-500 font-mono max-w-[200px] truncate">
                  {gamepad.id}
                </span>
              )}
            </div>

            {/* Giant Hero Controller */}
            <div className="w-full max-w-[620px] py-4 transition-transform duration-200 hover:scale-[1.02]">
              <ControllerSvg 
                type={profile.controllerType} 
                pressedButtons={gamepad.buttons}
                leftStickCoords={{ x: gamepad.axes[0], y: gamepad.axes[1] }}
                rightStickCoords={{ x: gamepad.axes[2], y: gamepad.axes[3] }}
                triggerValues={{ lt: gamepad.buttonValues.LT, rt: gamepad.buttonValues.RT }}
              />
            </div>
            
            {!gamepad.connected && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 animate-pulse">
                  <Gamepad2 className="h-7 w-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">Awaiting Hardware Handshake</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Connect an Xbox, PlayStation, Switch, or generic controller and press any button to link the browser Gamepad API telemetry.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Analog sticks & triggers telemetry row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Stick 1 */}
            <StickVisualizer 
              title="Left Thumbstick (LS)" 
              x={gamepad.axes[0]} 
              y={gamepad.axes[1]} 
            />

            {/* Stick 2 */}
            <StickVisualizer 
              title="Right Thumbstick (RS)" 
              x={gamepad.axes[2]} 
              y={gamepad.axes[3]} 
            />

            {/* Trigger bars */}
            <div className="bg-zinc-900/40 border border-zinc-900/80 p-5 rounded-2xl flex flex-col justify-center gap-4">
              <TriggerBar label="Left Trigger (LT)" val={gamepad.buttonValues.LT} />
              <TriggerBar label="Right Trigger (RT)" val={gamepad.buttonValues.RT} />
            </div>

          </div>
        </div>

        {/* Sidebar Diagnostics Info Panel - 4 columns */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Button States Matrix */}
          <div className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col text-left space-y-4">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-cyan font-display block">Signal Matrix</span>
              <h2 className="text-sm font-black text-white font-display uppercase">Hardware Button Grid</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {ALL_BUTTONS.map((btn) => {
                const isPressed = gamepad.buttons[btn] || false;
                return (
                  <div
                    key={btn}
                    className={`px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs transition-all duration-75 ${
                      isPressed
                        ? 'bg-brand-cyan/15 border-brand-cyan/50 text-brand-cyan font-bold shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                        : 'bg-zinc-900/20 border-zinc-900 text-zinc-500'
                    }`}
                  >
                    <span>{btn}</span>
                    <span className="text-[8px] font-mono tracking-wide">
                      {isPressed ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Haptic Actuators Test */}
          <div className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col text-left space-y-4">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-brand-purple font-display block">Rumble Actuators</span>
              <h2 className="text-sm font-black text-white font-display uppercase">Haptic Tester</h2>
            </div>
            
            <p className="text-[10px] text-zinc-500 leading-normal">
              Send diagnostic vibration pulses to test dual-rumble motors (Xbox/PS4 controllers only).
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={!gamepad.connected}
                onClick={() => handleTestVibration('correct')}
                className="py-2.5 px-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] font-bold font-display uppercase text-zinc-300 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Soft Rumble
              </button>
              <button
                disabled={!gamepad.connected}
                onClick={() => handleTestVibration('combo')}
                className="py-2.5 px-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] font-bold font-display uppercase text-zinc-300 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Medium rumble
              </button>
              <button
                disabled={!gamepad.connected}
                onClick={() => handleTestVibration('incorrect')}
                className="py-2.5 px-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] font-bold font-display uppercase text-zinc-300 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Sharp rumble
              </button>
              <button
                disabled={!gamepad.connected}
                onClick={() => handleTestVibration('levelup')}
                className="py-2.5 px-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] font-bold font-display uppercase text-zinc-300 hover:text-white hover:bg-zinc-800/60 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Strong Rumble
              </button>
            </div>
          </div>

          {/* Real-time Input Signal Log */}
          <div className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col text-left space-y-3 flex-1 min-h-[180px]">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 font-display block">Signal Buffer</span>
              <h2 className="text-sm font-black text-white font-display uppercase">Input Live History</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px] text-zinc-400 max-h-[160px]">
              {pressedHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 font-sans uppercase font-bold tracking-wider">
                  Buffer Empty - Press buttons
                </div>
              ) : (
                pressedHistory.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b border-zinc-900/40">
                    <span className="text-zinc-500 font-semibold">[{item.timestamp}]</span>
                    <span className="font-bold text-brand-cyan uppercase">{item.name} pressed</span>
                  </div>
                ))
              )}
            </div>

            {pressedHistory.length > 0 && (
              <button
                onClick={() => setPressedHistory([])}
                className="text-[9px] uppercase font-bold font-display text-zinc-500 hover:text-zinc-300 text-center w-full block pt-1 border-t border-zinc-900"
              >
                Clear Log History
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
