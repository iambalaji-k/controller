import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Award, Zap, Target, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

export const SessionReviewModal: React.FC = () => {
  const { 
    triggerReviewPopup, 
    setTriggerReviewPopup, 
    recentSessionResult, 
    stats 
  } = useApp();

  if (!triggerReviewPopup || !recentSessionResult) return null;

  const {
    accuracy,
    reactionTime,
    xpGained,
    strongestInput,
    weakestInput,
    recommendation,
    mistakes
  } = recentSessionResult;

  // Comparison with historical stats
  const accDiff = accuracy - stats.accuracy;
  const speedDiff = stats.reactionTime - reactionTime; // Positive means faster than average

  const totalMistakes = Object.values(mistakes).reduce((a: number, b: any) => a + b, 0) as number;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg glass-panel border border-brand-cyan/30 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glowing header banner */}
        <div className="h-1 bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-magenta" />
        
        <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-cyan animate-pulse" />
            <h3 className="text-sm font-black text-white font-display uppercase tracking-wider">
              Session Telemetry Review
            </h3>
          </div>
          <button
            onClick={() => setTriggerReviewPopup(false)}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 bg-zinc-800/40 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 text-left flex-1">
          
          {/* XP Reward & Splash */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-purple/10 to-brand-cyan/10 border border-brand-purple/20 rounded-2xl">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-brand-cyan font-display tracking-widest block">Session Completed</span>
              <p className="text-xs text-zinc-400">Your practice session telemetry has been processed.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-brand-purple font-display block">
                +{xpGained} XP
              </span>
              <span className="text-[9px] uppercase font-bold text-zinc-500 font-display">XP Synchronized</span>
            </div>
          </div>

          {/* Primary stats comparison */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Accuracy card */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-zinc-500 font-display">Session Accuracy</span>
                <Target className="h-4 w-4 text-brand-cyan" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-display">{accuracy}%</span>
                {accDiff !== 0 && (
                  <span className={`text-[10px] font-bold ${accDiff > 0 ? 'text-brand-green' : 'text-red-400'}`}>
                    {accDiff > 0 ? `+${accDiff}%` : `${accDiff}%`}
                  </span>
                )}
              </div>
              <span className="block text-[8px] text-zinc-500 font-medium">Compared to average ({stats.accuracy}%)</span>
            </div>

            {/* Reaction Speed card */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-zinc-500 font-display">Reaction Speed</span>
                <Zap className="h-4 w-4 text-brand-purple" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-display">{reactionTime}ms</span>
                {speedDiff !== 0 && (
                  <span className={`text-[10px] font-bold ${speedDiff > 0 ? 'text-brand-green' : 'text-red-400'}`}>
                    {speedDiff > 0 ? `-${speedDiff}ms` : `+${Math.abs(speedDiff)}ms`}
                  </span>
                )}
              </div>
              <span className="block text-[8px] text-zinc-500 font-medium">Compared to average ({stats.reactionTime}ms)</span>
            </div>

          </div>

          {/* Strongest & Weakest inputs */}
          <div className="grid grid-cols-2 gap-4">
            
            <div className="p-4 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 bg-brand-green/10 border border-brand-green/20 rounded-xl flex items-center justify-center text-brand-green flex-shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-zinc-500 font-display">Strongest Input</span>
                <span className="text-sm font-black text-white font-display">{strongestInput}</span>
                <span className="block text-[8px] text-zinc-500">Fast & precise</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/20 border border-zinc-900/80 rounded-2xl flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-zinc-500 font-display">Weakest Input</span>
                <span className="text-sm font-black text-white font-display">{weakestInput}</span>
                <span className="block text-[8px] text-zinc-500">{totalMistakes} errors logged</span>
              </div>
            </div>

          </div>

          {/* Engine recommendation */}
          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-2 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-brand-cyan flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase text-brand-cyan font-display tracking-wider">
                Tactical Performance Recommendation
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {recommendation}
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex justify-end">
          <button
            onClick={() => setTriggerReviewPopup(false)}
            className="px-6 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-zinc-950 text-xs font-black font-display uppercase tracking-wider shadow-lg shadow-brand-cyan/15 hover:shadow-brand-cyan/25 transition-all duration-200 cursor-pointer"
          >
            Review Completed
          </button>
        </div>

      </div>
    </div>
  );
};
