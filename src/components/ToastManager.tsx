import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Trophy, Award, Flame, Bell, X, ShieldAlert } from 'lucide-react';

export const ToastManager: React.FC = () => {
  const { toasts, removeToast } = useApp();

  const getIcon = (type: string, iconName?: string) => {
    if (type === 'achievement') {
      switch (iconName) {
        case 'Target': return <Trophy className="h-6 w-6 text-yellow-400" />;
        case 'Zap': return <Award className="h-6 w-6 text-cyan-400" />;
        case 'Flame': return <Flame className="h-6 w-6 text-red-500" />;
        case 'Crown': return <Trophy className="h-6 w-6 text-purple-400" />;
        default: return <Trophy className="h-6 w-6 text-yellow-500" />;
      }
    }
    if (type === 'levelUp') {
      return <ShieldAlert className="h-7 w-7 text-green-400 animate-bounce" />;
    }
    return <Bell className="h-5 w-5 text-purple-400" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-4 p-4 rounded-xl border glass-panel shadow-2xl overflow-hidden relative ${
              toast.type === 'levelUp'
                ? 'border-green-500/50 shadow-green-500/10'
                : toast.type === 'achievement'
                ? 'border-yellow-500/50 shadow-yellow-500/10'
                : 'border-purple-500/20'
            }`}
          >
            {/* Ambient background glow for levelUp/achievement */}
            {toast.type === 'levelUp' && (
              <div className="absolute inset-0 bg-green-500/5 blur-2xl pointer-events-none" />
            )}
            {toast.type === 'achievement' && (
              <div className="absolute inset-0 bg-yellow-500/5 blur-2xl pointer-events-none" />
            )}

            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type, toast.icon)}
            </div>

            <div className="flex-1">
              <h4 className={`text-sm font-semibold tracking-wider font-display uppercase ${
                toast.type === 'levelUp' ? 'text-green-400' : toast.type === 'achievement' ? 'text-yellow-400' : 'text-zinc-100'
              }`}>
                {toast.title}
              </h4>
              <p className="text-xs text-zinc-400 mt-1">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-md hover:bg-zinc-800/50"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Expiring progress bar indicator */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
              onAnimationComplete={() => removeToast(toast.id)}
              className={`absolute bottom-0 left-0 h-1 ${
                toast.type === 'levelUp'
                  ? 'bg-green-500'
                  : toast.type === 'achievement'
                  ? 'bg-yellow-500'
                  : 'bg-purple-500'
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
