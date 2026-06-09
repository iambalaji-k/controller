export type ControllerType = 'xbox' | 'playstation' | 'switch';
export type ControllerSkin = 'standard' | 'carbon' | 'gold' | 'cyberpunk';

export interface UserProfile {
  username: string;
  title: string;
  avatar: string;
  controllerType: ControllerType;
  level: number;
  xp: number;
  xpNeeded: number;
  selectedSkin?: ControllerSkin;
  skinsUnlocked?: ControllerSkin[];
  learningPathLevel?: number; // 1 to 10 guided path
  curriculumDay?: number; // 1 to 14 day KB/M transition curriculum
  curriculumProgress?: Record<number, boolean>;
  certifications?: Record<string, string>; // e.g. { 'batman': 'A', 'elden_ring': 'S' }
}

export interface StatHistoryEntry {
  date: string;
  xpGained: number;
  accuracy: number;
  reactionTime: number; // in ms
}

export interface SpacedRepetitionItem {
  level: number; // 0 to 5 review stages
  lastReviewed: string; // ISO date string
  nextReviewDate: string; // ISO date string
  mastered: boolean;
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
  fastestReactionTime?: number;
  buttonMastery?: Record<string, number>; // 0-100 mastery rating per button
  buttonMistakes?: Record<string, number>; // mistake counts per button
  buttonPracticeCounts?: Record<string, number>; // practice taps count per button
  buttonReactionTimes?: Record<string, number>; // average reaction speed in ms per button
  spacedRepetition?: Record<string, SpacedRepetitionItem>;
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

