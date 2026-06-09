import type { DrillCategory } from '../types';

export const DRILL_CATEGORIES: DrillCategory[] = [
  {
    id: 'centering',
    name: 'Centering & Tracking',
    description: 'Master joystick centering and smooth target tracking to keep your crosshair locked onto targets.',
    icon: 'Crosshair',
    difficulty: 'Beginner - Intermediate',
    isLocked: false,
    drills: [
      {
        id: 'slow_tracking',
        title: 'Smooth Tracking I',
        description: 'Keep your crosshair centered on a slow, predictably moving target.',
        difficulty: 'Beginner',
        duration: '2 min',
        xpReward: 50,
        metricType: 'accuracy'
      },
      {
        id: 'micro_adjustments',
        title: 'Micro Adjustments',
        description: 'Practice making fine stick movements to hit small targets that appear near your crosshair.',
        difficulty: 'Intermediate',
        duration: '3 min',
        xpReward: 100,
        metricType: 'accuracy'
      },
      {
        id: 'advanced_orbit',
        title: '360° Orbit Tracking',
        description: 'Track targets circling around you while maintaining vertical and horizontal alignment.',
        difficulty: 'Advanced',
        duration: '5 min',
        xpReward: 150,
        metricType: 'accuracy'
      }
    ]
  },
  {
    id: 'flicks',
    name: 'Flicks & Reflexes',
    description: 'Train your muscle memory for rapid, accurate snap target acquisition and high-speed target acquisition.',
    icon: 'Zap',
    difficulty: 'Intermediate - Expert',
    isLocked: false,
    drills: [
      {
        id: 'target_snap',
        title: 'Snap Shot Practice',
        description: 'Quickly move the right stick to snap onto sudden pop-up targets and immediately release to center.',
        difficulty: 'Intermediate',
        duration: '3 min',
        xpReward: 100,
        metricType: 'speed'
      },
      {
        id: 'reaction_snap',
        title: 'Reflex Trigger Snap',
        description: 'Fire immediately as a target flashes on the screen. Tests pure reaction and trigger pull speed.',
        difficulty: 'Expert',
        duration: '2 min',
        xpReward: 150,
        metricType: 'reactionTime'
      }
    ]
  },
  {
    id: 'movement',
    name: 'Movement & Combo Sync',
    description: 'Coordinate left-stick movement controls with right-stick aiming and face button presses.',
    icon: 'Compass',
    difficulty: 'Advanced - Expert',
    isLocked: true, // Let's lock this category to showcase the unlocking/progress system!
    drills: [
      {
        id: 'strafe_aim',
        title: 'Strafe Coordination',
        description: 'Counteract your own left-stick strafe movement with right-stick adjustments to keep aiming centered.',
        difficulty: 'Intermediate',
        duration: '3 min',
        xpReward: 120,
        metricType: 'accuracy'
      },
      {
        id: 'slide_cancel',
        title: 'Slide-Jump Reflexes',
        description: 'Execute rapid slide-cancel-jump button combos while tracking targets on the move.',
        difficulty: 'Expert',
        duration: '4 min',
        xpReward: 200,
        metricType: 'speed'
      }
    ]
  }
];
