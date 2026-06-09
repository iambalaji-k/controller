import React from 'react';
import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  iconName: string;
  colorClass: 'cyan' | 'purple' | 'magenta' | 'green';
  description: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  suffix = '',
  iconName,
  colorClass,
  description,
}) => {
  // Dynamically resolve icon from name
  const IconComponent = (Icons as any)[iconName] as LucideIcon || Icons.BarChart3;

  const colorStyles = {
    cyan: {
      text: 'text-brand-cyan',
      glow: 'hover:border-brand-cyan/40 hover:shadow-brand-cyan/5',
      bgGlow: 'bg-brand-cyan/5',
      indicator: 'bg-brand-cyan',
    },
    purple: {
      text: 'text-brand-purple',
      glow: 'hover:border-brand-purple/40 hover:shadow-brand-purple/5',
      bgGlow: 'bg-brand-purple/5',
      indicator: 'bg-brand-purple',
    },
    magenta: {
      text: 'text-brand-magenta',
      glow: 'hover:border-brand-magenta/40 hover:shadow-brand-magenta/5',
      bgGlow: 'bg-brand-magenta/5',
      indicator: 'bg-brand-magenta',
    },
    green: {
      text: 'text-brand-green',
      glow: 'hover:border-brand-green/40 hover:shadow-brand-green/5',
      bgGlow: 'bg-brand-green/5',
      indicator: 'bg-brand-green',
    },
  }[colorClass];

  return (
    <div
      className={`glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300 border border-white/5 flex flex-col justify-between h-36 ${colorStyles.glow} hover:shadow-xl hover:-translate-y-0.5 group`}
    >
      {/* Decorative background circle */}
      <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20 ${colorStyles.bgGlow}`} />

      {/* Top section: Title and Icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
          {title}
        </span>
        <div className={`p-2 rounded-xl border border-white/5 bg-zinc-900/50 group-hover:bg-zinc-800/80 transition-colors ${colorStyles.text}`}>
          <IconComponent className="h-4 w-4" />
        </div>
      </div>

      {/* Middle section: Numeric value */}
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-3xl font-extrabold tracking-tight font-display text-white">
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-semibold text-zinc-500">
            {suffix}
          </span>
        )}
      </div>

      {/* Bottom section: Text description */}
      <div className="text-xs text-zinc-500 mt-2 truncate">
        {description}
      </div>

      {/* Left accent indicator bar */}
      <div className={`absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r transition-all duration-300 opacity-50 group-hover:opacity-100 group-hover:h-1/2 ${colorStyles.indicator}`} />
    </div>
  );
};
