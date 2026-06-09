export type ControllerType = 'xbox' | 'playstation' | 'switch';

export interface UserProfile {
  username: string;
  title: string;
  avatar: string;
  controllerType: ControllerType;
  level: number;
  xp: number;
  xpNeeded: number;
}

export interface StatHistoryEntry {
  date: string;
  xpGained: number;
  accuracy: number;
  reactionTime: number; // in ms
}

export interface GameStats {
  accuracy: number; // 0-100
  speed: number; // 0-100
  consistency: number; // 0-100
  reactionTime: number; // ms
  streak: number;
  totalPlaytime: number; // in minutes
  drillsCompleted: number;
  history: StatHistoryEntry[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'general' | 'precision' | 'speed' | 'mastery';
  xpReward: number;
  maxProgress: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  icon: string; // Lucide icon name
}

export interface Drill {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  duration: string; // e.g. "5 min"
  xpReward: number;
  metricType: 'accuracy' | 'speed' | 'reactionTime';
}

export interface DrillCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  difficulty: string;
  drills: Drill[];
  isLocked: boolean;
}
