import type { Achievement } from '../types';

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first controller practice session.',
    category: 'general',
    xpReward: 100,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Play'
  },
  {
    id: 'accuracy_pro',
    title: 'Precision Marksman',
    description: 'Achieve an average accuracy of 92% or higher.',
    category: 'precision',
    xpReward: 250,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Target'
  },
  {
    id: 'speed_demon',
    title: 'Reflex Master',
    description: 'Reach a reaction time of 180ms or lower.',
    category: 'speed',
    xpReward: 250,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Zap'
  },
  {
    id: 'consistency_king',
    title: 'Dedicated Grind',
    description: 'Build a practice streak of 3 consecutive days.',
    category: 'general',
    xpReward: 400,
    maxProgress: 3,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Flame'
  },
  {
    id: 'drill_master',
    title: 'Challenger',
    description: 'Complete a total of 15 practice drills.',
    category: 'mastery',
    xpReward: 500,
    maxProgress: 15,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Trophy'
  },
  {
    id: 'legendary_aim',
    title: 'Controller Virtuoso',
    description: 'Complete 5 Advanced or Expert level drills.',
    category: 'mastery',
    xpReward: 750,
    maxProgress: 5,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Crown'
  }
];
