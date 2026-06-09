import React from 'react';
import { Target, Zap, Trophy, Gamepad2, ArrowRight } from 'lucide-react';
import { ControllerSvg } from '../components/ControllerSvg';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="relative min-h-[calc(100vh-61px)] flex flex-col justify-between overflow-hidden bg-[#050508]">
      
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f15_1px,transparent_1px),linear-gradient(to_bottom,#0f0f15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />
      
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-cyan/10 blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <main className="container mx-auto px-4 md:px-8 py-12 md:py-20 flex-1 flex flex-col lg:flex-row items-center gap-12 z-10">
        
        {/* Left Side: Marketing Text */}
        <div className="flex-1 flex flex-col items-start text-left space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-purple/30 bg-brand-purple/5 text-brand-purple text-xs font-bold font-display uppercase tracking-wider">
            <Gamepad2 className="h-3.5 w-3.5 text-brand-purple animate-pulse" />
            Next-Gen Aim Academy
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-tight uppercase">
            Master Your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-magenta text-glow-purple">
              Controller
            </span> <br/>
            Mechanics.
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 font-sans leading-relaxed">
            Eliminate stick drift error, hone micro-centering, and synchronize slide-cancels. Controller Mastery provides visual telemetry tools and structured routines designed to elevate thumbstick control for Xbox, PlayStation, and Switch operatives.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
            <button
              onClick={onEnter}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-zinc-950 font-black font-display tracking-wider uppercase flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] active:scale-95 transition-all duration-300 cursor-pointer"
            >
              Initialize Training
              <ArrowRight className="h-5 w-5 stroke-[2.5]" />
            </button>
            
            <a
              href="#features"
              className="px-6 py-4 rounded-xl border border-zinc-800 bg-zinc-900/20 text-zinc-300 font-bold font-display tracking-wide uppercase flex items-center justify-center gap-2 hover:bg-zinc-800/40 hover:border-zinc-700 transition-all duration-200"
            >
              Analyze Features
            </a>
          </div>

          {/* Quick Metrics display */}
          <div className="grid grid-cols-3 gap-6 sm:gap-10 pt-8 border-t border-zinc-900 w-full">
            <div>
              <span className="block text-2xl sm:text-3xl font-extrabold text-white font-display">180ms</span>
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Target Reflex</span>
            </div>
            <div>
              <span className="block text-2xl sm:text-3xl font-extrabold text-brand-cyan font-display">95%</span>
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Ideal Centering</span>
            </div>
            <div>
              <span className="block text-2xl sm:text-3xl font-extrabold text-brand-purple font-display">3 Layouts</span>
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Xbox / PS / Switch</span>
            </div>
          </div>
        </div>

        {/* Right Side: Glowing Controller Visualization */}
        <div className="flex-1 w-full max-w-lg lg:max-w-xl relative flex items-center justify-center">
          {/* Pulsing Backlight */}
          <div className="absolute w-72 h-72 rounded-full bg-brand-cyan/10 blur-[80px] animate-pulse-glow" />
          
          <div className="w-full relative group">
            {/* Holographic frame */}
            <div className="absolute inset-0 border border-brand-cyan/20 rounded-3xl [mask-image:linear-gradient(to_bottom,black,transparent)] pointer-events-none" />
            <ControllerSvg 
              type="xbox" 
              activePart="right-stick" 
              className="transform rotate-[-3deg] hover:rotate-[0deg] transition-transform duration-500" 
            />
          </div>
        </div>

      </main>

      {/* Feature section */}
      <section id="features" className="bg-zinc-950/60 border-t border-zinc-900 py-16 z-10 relative">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black font-display uppercase text-white">
              Tactical Training Framework
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              Our framework analyzes three pillars of controller telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-start text-left space-y-4">
              <div className="p-3 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-white uppercase">Precision Centering</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Train your muscle memory to snap joysticks directly back to center to maximize aim-assist friction bubbles in modern shooters.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-start text-left space-y-4">
              <div className="p-3 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-white uppercase">Flick Telemetry</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Increase consistency by logging stick tilt angles. Verify if you over-shoot or under-shoot fast target transitions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-start text-left space-y-4">
              <div className="p-3 rounded-xl bg-brand-magenta/10 text-brand-magenta border border-brand-magenta/20">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-white uppercase">Reward Progression</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Earn XP for every practice session, unlock achievements, climb levels, and track your performance curve over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-zinc-950 border-t border-zinc-900/60 z-10">
        <div className="container mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>&copy; 2026 Controller Mastery. Classified Training Protocols.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Operations</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Database</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
