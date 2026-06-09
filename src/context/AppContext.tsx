import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, GameStats, Achievement, DrillCategory } from '../types';
import { DEFAULT_ACHIEVEMENTS } from '../data/achievements';
import { DRILL_CATEGORIES } from '../data/guides';
import { triggerGamepadVibration, type HapticPattern } from '../utils/vibration';
import { audioFeedback } from '../utils/audio';

interface ToastNotification {
  id: string;
  type: 'achievement' | 'levelUp' | 'info';
  title: string;
  message: string;
  icon?: string;
  duration?: number;
}

interface AppContextType {
  profile: UserProfile;
  stats: GameStats;
  achievements: Achievement[];
  categories: DrillCategory[];
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  logDrillSession: (
    drillId: string, 
    performance: { 
      accuracy?: number; 
      speed?: number; 
      reactionTime?: number;
      buttonMistakes?: Record<string, number>;
    }
  ) => void;
  unlockCategory: (categoryId: string) => void;
  simulateStreak: () => void;
  resetProgress: () => void;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  setVibrationEnabled: (val: boolean) => void;
  setVibrationIntensity: (val: number) => void;
  triggerHaptic: (pattern: HapticPattern) => void;
  shakeScreen: boolean;
  colorblindMode: boolean;
  largeTextMode: boolean;
  reducedMotion: boolean;
  setColorblindMode: (val: boolean) => void;
  setLargeTextMode: (val: boolean) => void;
  setReducedMotion: (val: boolean) => void;
  // Guided learning pathway states
  readinessScore: number;
  readinessRank: string;
  weaknessRecommendations: string[];
  selectSkin: (skin: 'standard' | 'carbon' | 'gold' | 'cyberpunk') => void;
  unlockSkin: (skin: 'standard' | 'carbon' | 'gold' | 'cyberpunk') => void;
  incrementLearningPathLevel: () => void;
  completeCurriculumDay: (day: number) => void;
  saveCertificationGrade: (examId: string, grade: string) => void;
  recentSessionResult: {
    accuracy: number;
    speed: number;
    reactionTime: number;
    xpGained: number;
    date: string;
    mistakes: Record<string, number>;
    strongestInput: string;
    weakestInput: string;
    recommendation: string;
  } | null;
  setRecentSessionResult: (val: any) => void;
  triggerReviewPopup: boolean;
  setTriggerReviewPopup: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'controller_mastery_save';

const DEFAULT_PROFILE: UserProfile = {
  username: 'GhostRecruit',
  title: 'Bronze Recruit',
  avatar: 'avatar_1',
  controllerType: 'xbox',
  level: 1,
  xp: 0,
  xpNeeded: 800,
  selectedSkin: 'standard',
  skinsUnlocked: ['standard'],
  learningPathLevel: 1,
  curriculumDay: 1,
  curriculumProgress: {},
  certifications: {},
};

const DEFAULT_STATS: GameStats = {
  accuracy: 75,
  speed: 60,
  consistency: 65,
  reactionTime: 240, // in ms
  streak: 1,
  totalPlaytime: 15, // in minutes
  drillsCompleted: 0,
  history: [
    { date: 'Jun 05', xpGained: 50, accuracy: 70, reactionTime: 250 },
    { date: 'Jun 06', xpGained: 60, accuracy: 72, reactionTime: 245 },
    { date: 'Jun 07', xpGained: 80, accuracy: 74, reactionTime: 242 },
    { date: 'Jun 08', xpGained: 120, accuracy: 75, reactionTime: 240 },
  ],
  fastestReactionTime: 210,
  buttonMastery: {},
  buttonMistakes: {},
  buttonPracticeCounts: {},
  buttonReactionTimes: {},
  spacedRepetition: {},
};

const getDrillTargetButtons = (drillId: string): string[] => {
  if (drillId.includes('slow_tracking') || drillId.includes('strafe_aim') || drillId.includes('orbit')) {
    return ['LeftStick', 'RightStick'];
  }
  if (drillId.includes('micro_adjustments') || drillId.includes('flashcards') || drillId.includes('namethebutton') || drillId.includes('timed')) {
    return ['A', 'B', 'X', 'Y'];
  }
  if (drillId.includes('reaction_snap') || drillId.includes('trigger') || drillId.includes('depth')) {
    return ['LT', 'RT'];
  }
  if (drillId.includes('target_snap') || drillId.includes('reflex')) {
    return ['LB', 'RB'];
  }
  if (drillId.includes('slide_cancel')) {
    return ['A', 'B', 'LeftStick'];
  }
  if (drillId.includes('recall') || drillId.includes('rapid') || drillId.includes('patterns') || drillId.includes('dpad')) {
    return ['DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight'];
  }
  if (drillId.includes('basic') || drillId.includes('coordination') || drillId.includes('click')) {
    return ['L3', 'R3', 'LeftStick', 'RightStick'];
  }
  return ['A', 'B', 'X', 'Y'];
};

const updateSpacedRepetition = (buttons: string[], accuracy: number, reactionTime: number, statsObj: GameStats) => {
  const now = new Date();
  const nextSpaced = { ...(statsObj.spacedRepetition || {}) };
  
  buttons.forEach((btn) => {
    const current = nextSpaced[btn] || { level: 0, lastReviewed: now.toISOString(), nextReviewDate: now.toISOString(), mastered: false };
    
    let nextLevel = current.level;
    let mastered = current.mastered;
    
    if (accuracy >= 90 && reactionTime <= 260) {
      nextLevel = Math.min(5, current.level + 1);
      mastered = true;
    } else if (accuracy < 75 || reactionTime > 320) {
      nextLevel = Math.max(0, current.level - 1);
      mastered = false;
    }
    
    const intervals = [0, 1, 3, 7, 14, 30];
    const daysToAdd = intervals[nextLevel];
    
    const reviewDate = new Date();
    reviewDate.setDate(now.getDate() + daysToAdd);
    
    nextSpaced[btn] = {
      level: nextLevel,
      lastReviewed: now.toISOString(),
      nextReviewDate: reviewDate.toISOString(),
      mastered
    };
  });
  
  return nextSpaced;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [categories, setCategories] = useState<DrillCategory[]>(DRILL_CATEGORIES);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  // Haptic settings states
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [vibrationIntensity, setVibrationIntensity] = useState<number>(0.8);
  const [shakeScreen, setShakeScreen] = useState<boolean>(false);

  // Accessibility settings states
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);
  const [largeTextMode, setLargeTextMode] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Session review popup states
  const [recentSessionResult, setRecentSessionResult] = useState<any>(null);
  const [triggerReviewPopup, setTriggerReviewPopup] = useState<boolean>(false);

  // Load from local storage
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.profile) {
          setProfile({
            ...DEFAULT_PROFILE,
            ...parsed.profile,
            curriculumProgress: parsed.profile.curriculumProgress || {},
            certifications: parsed.profile.certifications || {},
            skinsUnlocked: parsed.profile.skinsUnlocked || ['standard'],
          });
        }
        if (parsed.stats) {
          setStats({
            ...DEFAULT_STATS,
            ...parsed.stats,
            buttonPracticeCounts: parsed.stats.buttonPracticeCounts || {},
            buttonReactionTimes: parsed.stats.buttonReactionTimes || {},
            spacedRepetition: parsed.stats.spacedRepetition || {},
          });
        }
        if (parsed.achievements) setAchievements(parsed.achievements);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.vibrationEnabled !== undefined) setVibrationEnabled(parsed.vibrationEnabled);
        if (parsed.vibrationIntensity !== undefined) setVibrationIntensity(parsed.vibrationIntensity);
        if (parsed.colorblindMode !== undefined) setColorblindMode(parsed.colorblindMode);
        if (parsed.largeTextMode !== undefined) setLargeTextMode(parsed.largeTextMode);
        if (parsed.reducedMotion !== undefined) setReducedMotion(parsed.reducedMotion);
      } catch (e) {
        console.error('Failed to parse localStorage save data', e);
      }
    }
  }, []);

  // Save to local storage
  const saveState = (
    newProfile: UserProfile,
    newStats: GameStats,
    newAchievements: Achievement[],
    newCategories: DrillCategory[],
    vibEnabled: boolean = vibrationEnabled,
    vibIntensity: number = vibrationIntensity,
    colorblind: boolean = colorblindMode,
    largeText: boolean = largeTextMode,
    redMotion: boolean = reducedMotion
  ) => {
    const data = { 
      profile: newProfile, 
      stats: newStats, 
      achievements: newAchievements, 
      categories: newCategories,
      vibrationEnabled: vibEnabled,
      vibrationIntensity: vibIntensity,
      colorblindMode: colorblind,
      largeTextMode: largeText,
      reducedMotion: redMotion
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  };

  // Helper functions for skins, levels, curriculum, exams
  const selectSkin = (skin: 'standard' | 'carbon' | 'gold' | 'cyberpunk') => {
    setProfile((prev) => {
      const next = { ...prev, selectedSkin: skin };
      saveState(next, stats, achievements, categories);
      return next;
    });
    addToast({
      type: 'info',
      title: 'Skins Calibration',
      message: `Equipped ${skin.toUpperCase()} telemetry skin.`,
    });
  };

  const unlockSkin = (skin: 'standard' | 'carbon' | 'gold' | 'cyberpunk') => {
    setProfile((prev) => {
      const nextUnlocked = [...(prev.skinsUnlocked || ['standard'])];
      if (!nextUnlocked.includes(skin)) {
        nextUnlocked.push(skin);
      }
      const next = { ...prev, skinsUnlocked: nextUnlocked as any };
      saveState(next, stats, achievements, categories);
      return next;
    });
    addToast({
      type: 'achievement',
      title: 'UNLOCKED SKIN!',
      message: `${skin.toUpperCase()} style registry opened.`,
    });
    triggerHaptic('achievement');
  };

  const incrementLearningPathLevel = () => {
    setProfile((prev) => {
      const nextLvl = Math.min(10, (prev.learningPathLevel || 1) + 1);
      const next = { ...prev, learningPathLevel: nextLvl };
      saveState(next, stats, achievements, categories);
      
      // Milestone checks & skins unlock
      if (nextLvl === 4) unlockSkin('carbon');
      if (nextLvl === 7) unlockSkin('cyberpunk');
      if (nextLvl === 10) unlockSkin('gold');

      return next;
    });
    addToast({
      type: 'info',
      title: 'Guided Path Upgraded',
      message: 'Next training module level is now accessible.',
    });
    triggerHaptic('levelup');
  };

  const completeCurriculumDay = (day: number) => {
    setProfile((prev) => {
      const nextProg = { ...(prev.curriculumProgress || {}), [day]: true };
      const nextDay = Math.min(14, day + 1);
      const next = { ...prev, curriculumProgress: nextProg, curriculumDay: nextDay };
      saveState(next, stats, achievements, categories);
      return next;
    });
    addToast({
      type: 'info',
      title: 'Transition Program Completed',
      message: `Day ${day} logs successfully synchronized.`,
    });
    triggerHaptic('levelup');
  };

  const saveCertificationGrade = (examId: string, grade: string) => {
    setProfile((prev) => {
      const nextCerts = { ...(prev.certifications || {}), [examId]: grade };
      const next = { ...prev, certifications: nextCerts };
      saveState(next, stats, achievements, categories);
      return next;
    });
    addToast({
      type: 'info',
      title: 'Exam Certificate Saved',
      message: `Your telemetry grade for ${examId.toUpperCase()} is registered: ${grade}`,
    });
    triggerHaptic('combo');
  };

  // Helper function to update vibration configurations
  const handleVibrationToggle = (val: boolean) => {
    setVibrationEnabled(val);
    saveState(profile, stats, achievements, categories, val, vibrationIntensity);
  };

  const handleVibrationIntensity = (val: number) => {
    setVibrationIntensity(val);
    saveState(profile, stats, achievements, categories, vibrationEnabled, val);
  };

  const handleColorblindToggle = (val: boolean) => {
    setColorblindMode(val);
    saveState(profile, stats, achievements, categories, vibrationEnabled, vibrationIntensity, val, largeTextMode, reducedMotion);
  };

  const handleLargeTextToggle = (val: boolean) => {
    setLargeTextMode(val);
    saveState(profile, stats, achievements, categories, vibrationEnabled, vibrationIntensity, colorblindMode, val, reducedMotion);
  };

  const handleReducedMotionToggle = (val: boolean) => {
    setReducedMotion(val);
    saveState(profile, stats, achievements, categories, vibrationEnabled, vibrationIntensity, colorblindMode, largeTextMode, val);
  };

  // Sync accessibility classes to HTML root element
  useEffect(() => {
    const html = document.documentElement;
    if (colorblindMode) html.classList.add('colorblind');
    else html.classList.remove('colorblind');

    if (largeTextMode) html.classList.add('large-text');
    else html.classList.remove('large-text');

    if (reducedMotion) html.classList.add('reduced-motion');
    else html.classList.remove('reduced-motion');
  }, [colorblindMode, largeTextMode, reducedMotion]);

  // Unified haptic trigger (checks hardware or runs visual fallback)
  const triggerHaptic = (pattern: HapticPattern) => {
    const hardwareRumble = triggerGamepadVibration(pattern, vibrationIntensity, vibrationEnabled);
    if (!hardwareRumble && vibrationEnabled) {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 250);
    }

    // Play synthesized feedback sound effect
    if (pattern === 'correct') {
      audioFeedback.play('correct');
    } else if (pattern === 'incorrect') {
      audioFeedback.play('incorrect');
    } else if (pattern === 'combo') {
      audioFeedback.play('combo');
    } else if (pattern === 'levelup') {
      audioFeedback.play('levelup');
    } else if (pattern === 'achievement') {
      audioFeedback.play('levelup');
    }
  };

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Update profile attributes
  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      saveState(next, stats, achievements, categories);
      return next;
    });
    addToast({
      type: 'info',
      title: 'Profile Updated',
      message: 'Your operative file has been synchronized.',
    });
  };

  // Unlock modules
  const unlockCategory = (categoryId: string) => {
    setCategories((prev) => {
      const next = prev.map((cat) => (cat.id === categoryId ? { ...cat, isLocked: false } : cat));
      saveState(profile, stats, achievements, next);
      return next;
    });
    addToast({
      type: 'info',
      title: 'Training Module Unlocked',
      message: `You now have access to ${categories.find(c => c.id === categoryId)?.name || 'new modules'}.`,
    });
  };

  // Handle XP adding and leveling up
  const addXP = (amount: number, currentProfile: UserProfile): UserProfile => {
    let newXp = currentProfile.xp + amount;
    let newLevel = currentProfile.level;
    let newXpNeeded = currentProfile.xpNeeded;

    const levelUpToast = (level: number) => {
      addToast({
        type: 'levelUp',
        title: 'LEVEL UP!',
        message: `Rank Promoted to Level ${level}! Keep pushing mechanics.`,
        duration: 5000,
      });
      triggerHaptic('levelup');
    };

    while (newXp >= newXpNeeded) {
      newXp -= newXpNeeded;
      newLevel += 1;
      newXpNeeded = Math.round(800 + (newLevel - 1) * 300);
      levelUpToast(newLevel);
    }

    let newTitle = currentProfile.title;
    if (newLevel >= 15) newTitle = 'Apex Aim Master';
    else if (newLevel >= 10) newTitle = 'Elite Controller Specialist';
    else if (newLevel >= 5) newTitle = 'Tactical Operative';
    else if (newLevel >= 3) newTitle = 'Mechanics Guard';

    return {
      ...currentProfile,
      level: newLevel,
      xp: newXp,
      xpNeeded: newXpNeeded,
      title: newTitle,
    };
  };

  // Evaluate and update achievements progress
  const checkAchievements = (
    updatedStats: GameStats,
    currentAchievements: Achievement[],
    currentProfile: UserProfile,
    latestPerformance?: { accuracy?: number; reactionTime?: number; drillId?: string }
  ): { nextAchievements: Achievement[]; nextProfile: UserProfile } => {
    let nextProfile = { ...currentProfile };
    
    const nextAchievements = currentAchievements.map((ach) => {
      if (ach.isUnlocked) return ach;

      let newProgress = ach.currentProgress;
      let shouldUnlock = false;

      switch (ach.id) {
        case 'first_press':
          newProgress = updatedStats.drillsCompleted >= 1 ? 1 : 0;
          shouldUnlock = newProgress >= ach.maxProgress;
          break;
        case 'button_scholar':
          if (latestPerformance?.accuracy !== undefined && latestPerformance.accuracy >= 95) {
            newProgress = 1;
            shouldUnlock = true;
          }
          break;
        case 'trigger_master':
          if (latestPerformance?.accuracy !== undefined && latestPerformance.accuracy >= 90) {
            newProgress = 1;
            shouldUnlock = true;
          }
          break;
        case 'combo_apprentice':
          if (latestPerformance?.drillId && (latestPerformance.drillId.includes('combo') || latestPerformance.drillId.includes('cancel'))) {
            newProgress = Math.min(ach.maxProgress, ach.currentProgress + 1);
            shouldUnlock = newProgress >= ach.maxProgress;
          }
          break;
        case 'reflex_ninja':
          if (latestPerformance?.reactionTime !== undefined && latestPerformance.reactionTime <= 180 && latestPerformance.reactionTime > 0) {
            newProgress = 1;
            shouldUnlock = true;
          }
          break;
        case 'blind_warrior':
          if (latestPerformance?.accuracy !== undefined && latestPerformance.accuracy >= 90) {
            newProgress = 1;
            shouldUnlock = true;
          }
          break;
        case 'controller_veteran':
          newProgress = Math.min(ach.maxProgress, updatedStats.drillsCompleted);
          shouldUnlock = newProgress >= ach.maxProgress;
          break;
        case 'muscle_memory_master':
          newProgress = Math.min(ach.maxProgress, currentProfile.level);
          shouldUnlock = newProgress >= ach.maxProgress;
          break;
        default:
          break;
      }

      if (shouldUnlock) {
        nextProfile = addXP(ach.xpReward, nextProfile);
        addToast({
          type: 'achievement',
          title: 'ACHIEVEMENT UNLOCKED!',
          message: `${ach.title} (+${ach.xpReward} XP)`,
          icon: ach.icon,
          duration: 5000,
        });
        triggerHaptic('achievement');
        
        return {
          ...ach,
          currentProgress: ach.maxProgress,
          isUnlocked: true,
          unlockedAt: new Date().toLocaleDateString(),
        };
      }

      return {
        ...ach,
        currentProgress: newProgress,
      };
    });

    return { nextAchievements, nextProfile };
  };

  // Log a simulated drill completion and recalculate stats/XP
  const logDrillSession = (
    drillId: string, 
    performance: { 
      accuracy?: number; 
      speed?: number; 
      reactionTime?: number;
      buttonMistakes?: Record<string, number>;
    }
  ) => {
    let drillXp = 50;
    
    for (const cat of categories) {
      const drill = cat.drills.find(d => d.id === drillId);
      if (drill) {
        drillXp = drill.xpReward;
        break;
      }
    }

    setStats((prevStats) => {
      const newDrillsCompleted = prevStats.drillsCompleted + 1;
      const sessionDuration = 3; 
      const newPlaytime = prevStats.totalPlaytime + sessionDuration;
      
      let newAccuracy = prevStats.accuracy;
      let newReactionTime = prevStats.reactionTime;
      let newSpeed = prevStats.speed;

      if (performance.accuracy !== undefined) {
        newAccuracy = Math.round((prevStats.accuracy * 4 + performance.accuracy) / 5);
      }
      if (performance.reactionTime !== undefined && performance.reactionTime > 0) {
        newReactionTime = Math.round((prevStats.reactionTime * 4 + performance.reactionTime) / 5);
      }
      if (performance.speed !== undefined) {
        newSpeed = Math.round((prevStats.speed * 4 + performance.speed) / 5);
      }

      const newConsistency = Math.max(
        50,
        Math.min(99, Math.round(100 - (Math.abs(newAccuracy - 85) + Math.abs(newSpeed - 80)) / 2))
      );

      let newFastestReactionTime = prevStats.fastestReactionTime ?? 240;
      if (performance.reactionTime !== undefined && performance.reactionTime > 0) {
        if (performance.reactionTime < newFastestReactionTime) {
          newFastestReactionTime = performance.reactionTime;
        }
      }

      // Track practice counts & reaction times per button
      const nextButtonPracticeCounts = { ...(prevStats.buttonPracticeCounts || {}) };
      const nextButtonReactionTimes = { ...(prevStats.buttonReactionTimes || {}) };
      const targetButtons = getDrillTargetButtons(drillId);
      targetButtons.forEach((btn) => {
        nextButtonPracticeCounts[btn] = (nextButtonPracticeCounts[btn] || 0) + 1;
        if (performance.reactionTime) {
          const prevTime = nextButtonReactionTimes[btn] || 250;
          nextButtonReactionTimes[btn] = Math.round((prevTime * 3 + performance.reactionTime) / 4);
        }
      });

      const nextButtonMistakes = { ...(prevStats.buttonMistakes || {}) };
      const nextButtonMastery = { ...(prevStats.buttonMastery || {}) };

      const BUTTON_POOL = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'LeftStick', 'RightStick', 'L3', 'R3', 'Start', 'Back'];
      BUTTON_POOL.forEach((btn) => {
        if (nextButtonMastery[btn] === undefined) {
          nextButtonMastery[btn] = 85; 
        }
        if (nextButtonMistakes[btn] === undefined) {
          nextButtonMistakes[btn] = 0;
        }
      });

      if (performance.buttonMistakes) {
        Object.entries(performance.buttonMistakes).forEach(([btn, count]) => {
          nextButtonMistakes[btn] = (nextButtonMistakes[btn] || 0) + count;
          nextButtonMastery[btn] = Math.max(15, (nextButtonMastery[btn] || 85) - count * 15);
        });

        BUTTON_POOL.forEach((btn) => {
          const hadMistake = performance.buttonMistakes && performance.buttonMistakes[btn] !== undefined;
          if (!hadMistake) {
            nextButtonMastery[btn] = Math.min(100, (nextButtonMastery[btn] || 85) + 3);
          }
        });
      } else {
        BUTTON_POOL.forEach((btn) => {
          nextButtonMastery[btn] = Math.min(100, (nextButtonMastery[btn] || 85) + 2);
        });
      }

      // Spaced repetition update
      const nextSpaced = updateSpacedRepetition(targetButtons, performance.accuracy ?? 100, performance.reactionTime ?? 200, prevStats);

      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const newHistoryEntry = {
        date: today,
        xpGained: drillXp,
        accuracy: performance.accuracy ?? prevStats.accuracy,
        reactionTime: performance.reactionTime ?? prevStats.reactionTime,
      };

      const updatedHistory = [...prevStats.history.slice(-7), newHistoryEntry];

      const nextStats: GameStats = {
        ...prevStats,
        drillsCompleted: newDrillsCompleted,
        totalPlaytime: newPlaytime,
        accuracy: newAccuracy,
        reactionTime: newReactionTime,
        speed: newSpeed,
        consistency: newConsistency,
        history: updatedHistory,
        fastestReactionTime: newFastestReactionTime,
        buttonMistakes: nextButtonMistakes,
        buttonMastery: nextButtonMastery,
        buttonPracticeCounts: nextButtonPracticeCounts,
        buttonReactionTimes: nextButtonReactionTimes,
        spacedRepetition: nextSpaced,
      };

      // Set profile & achievements
      setProfile((prevProfile) => {
        let updatedProfile = addXP(drillXp, prevProfile);

        setAchievements((prevAch) => {
          const { nextAchievements, nextProfile: finalProfile } = checkAchievements(
            nextStats,
            prevAch,
            updatedProfile,
            {
              accuracy: performance.accuracy,
              reactionTime: performance.reactionTime,
              drillId
            }
          );
          
          updatedProfile = finalProfile;
          saveState(updatedProfile, nextStats, nextAchievements, categories);
          return nextAchievements;
        });

        // Trigger session review screen details
        let strongestInput = 'A';
        let strongestVal = 0;
        BUTTON_POOL.forEach((b) => {
          const taps = nextButtonPracticeCounts[b] || 0;
          if (taps > strongestVal && (nextButtonMastery[b] || 85) >= 90) {
            strongestVal = taps;
            strongestInput = b;
          }
        });

        let weakestInput = 'Y';
        let weakestVal = 100;
        BUTTON_POOL.forEach((b) => {
          const mastery = nextButtonMastery[b] || 85;
          if (mastery < weakestVal) {
            weakestVal = mastery;
            weakestInput = b;
          }
        });

        let drillRec = 'Keep practice intervals stable to solidifying mechanics.';
        if ((performance.accuracy ?? 100) < 85) {
          drillRec = `Your accuracy on ${weakestInput} was sub-optimal. Focus on locating trigger zones without looking.`;
        } else if ((performance.reactionTime ?? 200) > 250) {
          drillRec = 'Reaction time is slightly slow. Try a Reflex Rapid Fire drill to sharpen reflex muscle fibers.';
        }

        setRecentSessionResult({
          accuracy: performance.accuracy ?? 90,
          speed: performance.speed ?? 80,
          reactionTime: performance.reactionTime ?? 210,
          xpGained: drillXp,
          date: today,
          mistakes: performance.buttonMistakes || {},
          strongestInput,
          weakestInput,
          recommendation: drillRec,
        });
        setTriggerReviewPopup(true);

        return updatedProfile;
      });

      return nextStats;
    });

    addToast({
      type: 'info',
      title: 'Drill Completed!',
      message: `Logged +${drillXp} XP. Stats updated.`,
    });

    const goldAcc = performance.accuracy && performance.accuracy >= 94;
    triggerHaptic(goldAcc ? 'combo' : 'correct');
  };

  // Simulate a 3-day practice streak
  const simulateStreak = () => {
    setStats((prev) => {
      const nextStats = { ...prev, streak: 3 };
      
      setProfile((prevProfile) => {
        setAchievements((prevAch) => {
          const { nextAchievements, nextProfile: finalProfile } = checkAchievements(
            nextStats,
            prevAch,
            prevProfile
          );
          
          saveState(finalProfile, nextStats, nextAchievements, categories);
          return nextAchievements;
        });
        return prevProfile;
      });

      return nextStats;
    });
    
    addToast({
      type: 'info',
      title: 'Streak Synced',
      message: 'Simulated 3-day practice streak successfully.',
    });
  };

  // Reset progress to original state
  const resetProgress = () => {
    setProfile(DEFAULT_PROFILE);
    setStats(DEFAULT_STATS);
    setAchievements(DEFAULT_ACHIEVEMENTS);
    setCategories(DRILL_CATEGORIES);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    addToast({
      type: 'info',
      title: 'Database Reset',
      message: 'All local training statistics have been purged.',
    });
  };

  // Compute readiness score & rank
  const getReadinessIndex = (statsObj: GameStats, profileObj: UserProfile): { score: number; rank: string } => {
    const accuracyComponent = statsObj.accuracy;
    const speedComponent = Math.max(0, Math.min(100, Math.round((350 - statsObj.reactionTime) / 2)));
    
    const spaced = statsObj.spacedRepetition || {};
    const masteredButtonsCount = Object.values(spaced).filter((item: any) => item.mastered).length;
    const repComponent = Math.round((masteredButtonsCount / 18) * 100);

    const pathLvl = profileObj.learningPathLevel || 1;
    const pathComponent = Math.min(100, pathLvl * 10);

    const certs = profileObj.certifications || {};
    let certSum = 0;
    const certKeys = Object.keys(certs);
    if (certKeys.length > 0) {
      certKeys.forEach((k) => {
        const grade = certs[k];
        if (grade === 'S') certSum += 100;
        else if (grade === 'A') certSum += 90;
        else if (grade === 'B') certSum += 80;
        else if (grade === 'C') certSum += 70;
        else if (grade === 'D') certSum += 60;
        else certSum += 40;
      });
      certSum = Math.round(certSum / certKeys.length);
    } else {
      certSum = 60; 
    }

    const finalScore = Math.max(10, Math.min(100, Math.round(
      accuracyComponent * 0.3 +
      speedComponent * 0.3 +
      repComponent * 0.15 +
      pathComponent * 0.15 +
      certSum * 0.1
    )));

    let rank = 'Beginner';
    if (finalScore >= 95) rank = 'Master';
    else if (finalScore >= 85) rank = 'Expert';
    else if (finalScore >= 70) rank = 'Advanced';
    else if (finalScore >= 50) rank = 'Intermediate';
    else if (finalScore >= 30) rank = 'Novice';

    return { score: finalScore, rank };
  };

  const { score: readinessScore, rank: readinessRank } = getReadinessIndex(stats, profile);

  // Weakness detection recommendations engine
  const getWeaknessRecommendations = (statsObj: GameStats): string[] => {
    const recs: string[] = [];
    const mistakes = statsObj.buttonMistakes || {};
    const rxTimes = statsObj.buttonReactionTimes || {};

    const lbMistakes = mistakes['LB'] || 0;
    const ltMistakes = mistakes['LT'] || 0;
    if (lbMistakes > 2 && ltMistakes > 2) {
      recs.push("You frequently confuse LB (Bumper) and LT (Trigger). Focus on index finger placement.");
    }
    
    const rbMistakes = mistakes['RB'] || 0;
    const rtMistakes = mistakes['RT'] || 0;
    if (rbMistakes > 2 && rtMistakes > 2) {
      recs.push("You confuse RB (Bumper) and RT (Trigger). Focus on middle finger isolation.");
    }

    const xMistakes = mistakes['X'] || 0;
    const yMistakes = mistakes['Y'] || 0;
    if (xMistakes > 3 && yMistakes > 3) {
      recs.push("Telemetry indicates face button X/Y confusion. Review color markers under Phase 1.");
    }

    const avgReaction = statsObj.reactionTime;
    Object.entries(rxTimes).forEach(([btn, time]) => {
      const btnTime = time as number;
      if (btnTime > avgReaction * 1.25) {
        const percentSlower = Math.round(((btnTime - avgReaction) / avgReaction) * 100);
        recs.push(`Your reaction to ${btn} (${btnTime}ms) is ${percentSlower}% slower than your average.`);
      }
    });

    const l3Mastery = statsObj.buttonMastery?.['L3'] || 85;
    const r3Mastery = statsObj.buttonMastery?.['R3'] || 85;
    if (l3Mastery < 70 || r3Mastery < 70) {
      recs.push("Left/Right Stick Click (L3/R3) responses are unstable. Practice coordinate pivots.");
    }

    if (recs.length === 0) {
      recs.push("All mechanics are calibrated within stable parameters. Maintain spaced repetition reviews.");
    }

    return recs.slice(0, 3);
  };

  const weaknessRecommendations = getWeaknessRecommendations(stats);

  return (
    <AppContext.Provider
      value={{
        profile,
        stats,
        achievements,
        categories,
        toasts,
        addToast,
        removeToast,
        updateProfile,
        logDrillSession,
        unlockCategory,
        simulateStreak,
        resetProgress,
        vibrationEnabled,
        vibrationIntensity,
        setVibrationEnabled: handleVibrationToggle,
        setVibrationIntensity: handleVibrationIntensity,
        triggerHaptic,
        shakeScreen,
        colorblindMode,
        largeTextMode,
        reducedMotion,
        setColorblindMode: handleColorblindToggle,
        setLargeTextMode: handleLargeTextToggle,
        setReducedMotion: handleReducedMotionToggle,
        // Guided learning properties
        readinessScore,
        readinessRank,
        weaknessRecommendations,
        selectSkin,
        unlockSkin,
        incrementLearningPathLevel,
        completeCurriculumDay,
        saveCertificationGrade,
        recentSessionResult,
        setRecentSessionResult,
        triggerReviewPopup,
        setTriggerReviewPopup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
