import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ControllerType } from '../types';
import { User, Gamepad2, Database, Save, Award, BadgeAlert } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile, resetProgress } = useApp();

  const [username, setUsername] = useState(profile.username);
  const [controllerType, setControllerType] = useState<ControllerType>(profile.controllerType);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [selectedTitle, setSelectedTitle] = useState(profile.title);

  // Avatar presets list
  const avatars = [
    { id: 'avatar_1', name: 'Phantom', color: 'bg-brand-purple/20 text-brand-purple border-brand-purple/30' },
    { id: 'avatar_2', name: 'Spectre', color: 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30' },
    { id: 'avatar_3', name: 'Vortex', color: 'bg-brand-magenta/20 text-brand-magenta border-brand-magenta/30' },
    { id: 'avatar_4', name: 'Apex', color: 'bg-brand-green/20 text-brand-green border-brand-green/30' },
  ];

  // Titles list with level requirements
  const titles = [
    { name: 'Bronze Recruit', minLevel: 1 },
    { name: 'Mechanics Guard', minLevel: 3 },
    { name: 'Tactical Operative', minLevel: 5 },
    { name: 'Elite Controller Specialist', minLevel: 10 },
    { name: 'Apex Aim Master', minLevel: 15 },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    updateProfile({
      username: username.trim(),
      controllerType,
      avatar,
      title: selectedTitle,
    });
  };

  const getControllerColor = (type: ControllerType) => {
    switch (type) {
      case 'xbox': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/60 shadow-emerald-500/5';
      case 'playstation': return 'border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-500/60 shadow-blue-500/5';
      case 'switch': return 'border-rose-500/30 text-rose-400 bg-rose-500/5 hover:border-rose-500/60 shadow-rose-500/5';
    }
  };

  const getControllerLabel = (type: ControllerType) => {
    switch (type) {
      case 'xbox': return 'Xbox Asymmetric';
      case 'playstation': return 'DualSense Symmetric';
      case 'switch': return 'Joy-Con Asymmetric';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <section className="text-left space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight">
          Operative File Config
        </h1>
        <p className="text-xs md:text-sm text-zinc-400">
          Modify telemetry controller layouts, avatar signatures, and sync profile records.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Main Settings Form (Left/2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <User className="h-5 w-5 text-brand-purple" />
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                Operative Identity
              </h2>
            </div>

            {/* Username Input */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-display">
                Operative Callsign
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={18}
                className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-100 text-sm font-medium focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 focus:outline-none transition-colors"
                placeholder="GhostRecruit"
                required
              />
            </div>

            {/* Avatar choice */}
            <div className="space-y-2.5">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-display">
                Tactical Signature Emblem
              </span>
              <div className="grid grid-cols-4 gap-3">
                {avatars.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatar(av.id)}
                    className={`h-14 rounded-xl flex flex-col items-center justify-center text-xs font-black font-display transition-all duration-300 border ${
                      avatar === av.id
                        ? `${av.color} ring-2 ring-brand-purple/40 scale-[1.03]`
                        : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    <span>{av.name.slice(0, 2).toUpperCase()}</span>
                    <span className="text-[8px] mt-0.5 opacity-60 font-semibold">{av.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title Selector */}
            <div className="space-y-2.5">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-display">
                Earned Tactical Title Badge
              </span>
              <div className="space-y-2">
                {titles.map((t) => {
                  const isLocked = profile.level < t.minLevel;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => !isLocked && setSelectedTitle(t.name)}
                      className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                        isLocked
                          ? 'opacity-40 border-zinc-900 bg-zinc-950/20 text-zinc-600 cursor-not-allowed'
                          : selectedTitle === t.name
                          ? 'border-brand-cyan bg-brand-cyan/5 text-brand-cyan shadow-md shadow-brand-cyan/2'
                          : 'border-zinc-800 bg-zinc-900/20 text-zinc-300 hover:border-zinc-700'
                      }`}
                      disabled={isLocked}
                    >
                      <div className="flex items-center gap-2.5 text-xs font-bold font-display uppercase tracking-wider">
                        {isLocked ? (
                          <BadgeAlert className="h-4 w-4 text-zinc-600" />
                        ) : (
                          <Award className={`h-4 w-4 ${selectedTitle === t.name ? 'text-brand-cyan animate-pulse' : 'text-zinc-500'}`} />
                        )}
                        {t.name}
                      </div>
                      
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                        {isLocked ? `Locked (LVL ${t.minLevel})` : 'Unlocked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold font-display uppercase tracking-wider shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all duration-200 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Synchronize Configuration
              </button>
            </div>

          </form>
        </div>

        {/* Controller Type selection (Right/1 Column) */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Gamepad2 className="h-5 w-5 text-brand-cyan" />
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                Controller Config
              </h2>
            </div>

            <p className="text-[10px] text-zinc-500 leading-normal">
              Selecting your active controller model matches telemetry graphics and button designations to your physical device inputs.
            </p>

            <div className="flex flex-col gap-3.5">
              {(['xbox', 'playstation', 'switch'] as ControllerType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setControllerType(type)}
                  className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all duration-300 relative overflow-hidden shadow-lg ${
                    controllerType === type
                      ? `${getControllerColor(type)} ring-1 ring-white/10 scale-[1.02]`
                      : 'bg-zinc-900/20 border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider font-display text-white">
                    {getControllerLabel(type)}
                  </span>
                  <span className="text-[9px] font-semibold opacity-70">
                    {type === 'xbox' && 'Asymmetric stick layout, Trigger Pull triggers.'}
                    {type === 'playstation' && 'Symmetric dual stick, Adaptive feedback curves.'}
                    {type === 'switch' && 'Asymmetric layout, Flat click digital micro-bumpers.'}
                  </span>
                  
                  {controllerType === type && (
                    <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Database Reset widget */}
          <div className="glass-panel p-6 rounded-2xl border border-red-500/10 bg-red-950/2 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3 text-red-500">
              <Database className="h-5 w-5" />
              <h2 className="text-sm font-bold font-display uppercase tracking-wider">
                Operative Purge
              </h2>
            </div>

            <p className="text-[10px] text-zinc-500 leading-normal">
              This triggers a hard wipe of the LocalStorage database file. All completed drills, accumulated levels, and unlocked medals will be permanently purged.
            </p>

            <button
              type="button"
              onClick={() => {
                if (confirm('CRITICAL ACTION: Reset all training data, level ranks, and settings? This cannot be undone.')) {
                  resetProgress();
                  setUsername('GhostRecruit');
                  setAvatar('avatar_1');
                  setControllerType('xbox');
                  setSelectedTitle('Bronze Recruit');
                  window.location.reload();
                }
              }}
              className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-semibold font-display uppercase tracking-wider transition-colors cursor-pointer"
            >
              Purge Database Logs
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
