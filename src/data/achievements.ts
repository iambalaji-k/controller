import type { Achievement } from '../types';

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_press',
    title: 'First Press',
    description: 'Complete your first controller practice session.',
    category: 'general',
    xpReward: 100,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Play'
  },
  {
    id: 'button_scholar',
    title: 'Button Scholar',
    description: 'Achieve an accuracy of 95% or higher in recognition drills.',
    category: 'precision',
    xpReward: 200,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Target'
  },
  {
    id: 'trigger_master',
    title: 'Trigger Master',
    description: 'Perform trigger alternating calibration with 90%+ accuracy.',
    category: 'precision',
    xpReward: 250,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Shield'
  },
  {
    id: 'combo_apprentice',
    title: 'Combo Apprentice',
    description: 'Successfully complete 5 controller combos in sequence.',
    category: 'mastery',
    xpReward: 300,
    maxProgress: 5,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Crown'
  },
  {
    id: 'reflex_ninja',
    title: 'Reflex Ninja',
    description: 'Reach a reaction speed of 180ms or lower in timed reflex drills.',
    category: 'speed',
    xpReward: 300,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Zap'
  },
  {
    id: 'blind_warrior',
    title: 'Blind Warrior',
    description: 'Complete any blind memory drill with 90%+ accuracy.',
    category: 'mastery',
    xpReward: 400,
    maxProgress: 1,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'EyeOff'
  },
  {
    id: 'controller_veteran',
    title: 'Controller Veteran',
    description: 'Complete 15 total controller drills.',
    category: 'general',
    xpReward: 500,
    maxProgress: 15,
    currentProgress: 0,
    isUnlocked: false,
    icon: 'Trophy'
  },
  {
    id: 'muscle_memory_master',
    title: 'Muscle Memory Master',
    description: 'Develop stable muscle memory by reaching Operative Rank Level 5.',
    category: 'mastery',
    xpReward: 600,
    maxProgress: 5,
    currentProgress: 1,
    isUnlocked: false,
    icon: 'Award'
  }
];
