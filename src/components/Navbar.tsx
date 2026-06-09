import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Target, User, Trophy, LogOut, Shield } from 'lucide-react';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, setActivePage }) => {
  const { profile, resetProgress } = useApp();

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'training', label: 'Training Drills', icon: Target },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'profile', label: 'Operative Profile', icon: User },
  ];

  // Helper to get avatar initials
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  // Controller type indicator color
  const getControllerColor = (type: string) => {
    if (type === 'xbox') return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
    if (type === 'playstation') return 'border-blue-500 text-blue-400 bg-blue-500/10';
    return 'border-rose-500 text-rose-400 bg-rose-500/10';
  };

  // Calculate XP percentage
  const xpPercentage = Math.min(100, (profile.xp / profile.xpNeeded) * 100);

  return (
    <>
      {/* Top Header Navbar - Logo & XP & Profile */}
      <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Glowing Game Logo */}
          <div 
            onClick={() => setActivePage('landing')} 
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan p-0.5 flex items-center justify-center shadow-lg shadow-brand-purple/20 group-hover:scale-105 transition-all duration-300">
              <Shield className="h-5 w-5 text-zinc-950 fill-white" />
            </div>
            <span className="font-display font-black tracking-wider text-lg uppercase bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
              Controller<span className="text-brand-cyan text-glow-cyan font-semibold">Mastery</span>
            </span>
          </div>
        </div>

        {/* Level and XP widget (Desktop only) */}
        {activePage !== 'landing' && (
          <div className="hidden md:flex items-center gap-5 bg-zinc-900/40 border border-zinc-800/80 px-4 py-1.5 rounded-2xl w-80">
            <div className="flex flex-col">
              <div className="flex justify-between items-baseline text-xs font-semibold uppercase tracking-wider mb-1 font-display">
                <span className="text-zinc-400">Level {profile.level}</span>
                <span className="text-zinc-500">{profile.xp} / {profile.xpNeeded} XP</span>
              </div>
              <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            {/* Avatar & Title summary */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('profile')}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black font-display bg-brand-purple/20 text-brand-purple border border-brand-purple/30`}>
                {getInitials(profile.username)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-200 leading-tight truncate max-w-[80px]">{profile.username}</span>
                <span className="text-[10px] text-brand-cyan tracking-wider font-semibold uppercase truncate max-w-[80px]">{profile.title}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="flex items-center gap-2">
          {activePage === 'landing' ? (
            <button
              onClick={() => setActivePage('dashboard')}
              className="px-4 py-1.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold tracking-wide font-display uppercase shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/30 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Enter Hub
            </button>
          ) : (
            <>
              {/* Mobile Rank Indicator */}
              <div className="md:hidden flex items-center justify-center h-8 px-2.5 rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 text-brand-cyan text-xs font-black font-display uppercase">
                LVL {profile.level}
              </div>
              
              {/* Reset shortcut */}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all training stats and profile rank?')) {
                    resetProgress();
                    setActivePage('landing');
                  }
                }}
                className="p-2 rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200"
                title="Reset Database Profile"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Navigation Layout */}
      {activePage !== 'landing' && (
        <>
          {/* Desktop Left Sidebar (Visible on MD and larger viewports) */}
          <aside className="fixed left-0 top-[61px] bottom-0 w-64 bg-zinc-950 border-r border-zinc-900 hidden md:flex flex-col justify-between p-4 z-30">
            <nav className="flex flex-col gap-1.5 mt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide font-display transition-all duration-300 ${
                      isActive
                        ? 'bg-brand-purple/10 text-brand-purple border-l-2 border-brand-purple shadow-[inset_4px_0_12px_rgba(139,92,246,0.05)]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-brand-purple' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Quick Controller Indicator */}
            <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Controller Config</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getControllerColor(profile.controllerType)}`}>
                {profile.controllerType} Layout
              </span>
            </div>
          </aside>

          {/* Mobile Bottom Navigation (Visible on viewport sizes below MD) */}
          <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-900 h-16 flex items-center justify-around z-30 md:hidden px-2 pb-safe">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 w-20 h-14 rounded-xl transition-all duration-200 ${
                    isActive ? 'text-brand-cyan' : 'text-zinc-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-semibold font-display tracking-wider truncate max-w-full">
                    {item.label.split(' ')[0]}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </>
      )}
    </>
  );
};
