import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, GameStats, Achievement, DrillCategory } from '../types';
import { DEFAULT_ACHIEVEMENTS } from '../data/achievements';
import { DRILL_CATEGORIES } from '../data/guides';

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
    performance: { accuracy?: number; speed?: number; reactionTime?: number }
  ) => void;
  unlockCategory: (categoryId: string) => void;
  simulateStreak: () => void;
  resetProgress: () => void;
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
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [categories, setCategories] = useState<DrillCategory[]>(DRILL_CATEGORIES);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Load from local storage
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.achievements) setAchievements(parsed.achievements);
        if (parsed.categories) setCategories(parsed.categories);
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
    newCategories: DrillCategory[]
  ) => {
    const data = { profile: newProfile, stats: newStats, achievements: newAchievements, categories: newCategories };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
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
    };

    while (newXp >= newXpNeeded) {
      newXp -= newXpNeeded;
      newLevel += 1;
      // Formula for scaling XP required per level
      newXpNeeded = Math.round(800 + (newLevel - 1) * 300);
      levelUpToast(newLevel);
    }

    // Dynamic Title based on level
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
    currentProfile: UserProfile
  ): { nextAchievements: Achievement[]; nextProfile: UserProfile } => {
    let nextProfile = { ...currentProfile };
    
    const nextAchievements = currentAchievements.map((ach) => {
      if (ach.isUnlocked) return ach;

      let newProgress = ach.currentProgress;
      let shouldUnlock = false;

      switch (ach.id) {
        case 'first_steps':
          newProgress = updatedStats.drillsCompleted >= 1 ? 1 : 0;
          shouldUnlock = newProgress >= ach.maxProgress;
          break;
        case 'accuracy_pro':
          if (updatedStats.history.length > 0) {
            const latestAcc = updatedStats.history[updatedStats.history.length - 1].accuracy;
            if (latestAcc >= 92) {
              newProgress = 1;
              shouldUnlock = true;
            }
          }
          break;
        case 'speed_demon':
          if (updatedStats.history.length > 0) {
            const latestRt = updatedStats.history[updatedStats.history.length - 1].reactionTime;
            if (latestRt <= 180 && latestRt > 0) {
              newProgress = 1;
              shouldUnlock = true;
            }
          }
          break;
        case 'consistency_king':
          newProgress = Math.min(ach.maxProgress, updatedStats.streak);
          shouldUnlock = newProgress >= ach.maxProgress;
          break;
        case 'drill_master':
          newProgress = Math.min(ach.maxProgress, updatedStats.drillsCompleted);
          shouldUnlock = newProgress >= ach.maxProgress;
          break;
        case 'legendary_aim':
          // Let's count how many high tier drills have been completed
          // In a mock demo, we'll increment when the user completes expert drills
          // We will update this field incrementally in logDrillSession
          break;
        default:
          break;
      }

      if (shouldUnlock) {
        // Award XP
        nextProfile = addXP(ach.xpReward, nextProfile);
        // Show Toast
        addToast({
          type: 'achievement',
          title: 'ACHIEVEMENT UNLOCKED!',
          message: `${ach.title} (+${ach.xpReward} XP)`,
          icon: ach.icon,
          duration: 5000,
        });
        
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
    performance: { accuracy?: number; speed?: number; reactionTime?: number }
  ) => {
    // Find the drill and its details
    let drillXp = 50;
    let drillDifficulty = 'Beginner';
    
    for (const cat of categories) {
      const drill = cat.drills.find(d => d.id === drillId);
      if (drill) {
        drillXp = drill.xpReward;
        drillDifficulty = drill.difficulty;
        break;
      }
    }

    setStats((prevStats) => {
      const newDrillsCompleted = prevStats.drillsCompleted + 1;
      const sessionDuration = 3; // mock duration 3 mins
      const newPlaytime = prevStats.totalPlaytime + sessionDuration;
      
      // Calculate new rolling averages
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

      // Calculate consistency (rolling average variation)
      const newConsistency = Math.max(
        50,
        Math.min(99, Math.round(100 - (Math.abs(newAccuracy - 85) + Math.abs(newSpeed - 80)) / 2))
      );

      // Create new history entry
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const newHistoryEntry = {
        date: today,
        xpGained: drillXp,
        accuracy: performance.accuracy ?? prevStats.accuracy,
        reactionTime: performance.reactionTime ?? prevStats.reactionTime,
      };

      const updatedHistory = [...prevStats.history.slice(-7), newHistoryEntry]; // Keep last 8 entries

      const nextStats: GameStats = {
        ...prevStats,
        drillsCompleted: newDrillsCompleted,
        totalPlaytime: newPlaytime,
        accuracy: newAccuracy,
        reactionTime: newReactionTime,
        speed: newSpeed,
        consistency: newConsistency,
        history: updatedHistory,
      };

      // Now set profile and achievements
      setProfile((prevProfile) => {
        // Gain XP for completing the drill
        let updatedProfile = addXP(drillXp, prevProfile);

        setAchievements((prevAch) => {
          // Increment "legendary_aim" achievement progress if intermediate/expert
          let achievementsToTest = [...prevAch];
          if (drillDifficulty === 'Expert' || drillDifficulty === 'Advanced') {
            achievementsToTest = achievementsToTest.map(a => {
              if (a.id === 'legendary_aim' && !a.isUnlocked) {
                const nextProg = a.currentProgress + 1;
                return {
                  ...a,
                  currentProgress: nextProg,
                  isUnlocked: nextProg >= a.maxProgress,
                  unlockedAt: nextProg >= a.maxProgress ? new Date().toLocaleDateString() : undefined
                };
              }
              return a;
            });
            // If legendary aim unlocked, award reward
            const legendAch = achievementsToTest.find(a => a.id === 'legendary_aim');
            if (legendAch && legendAch.isUnlocked && !prevAch.find(a => a.id === 'legendary_aim')?.isUnlocked) {
              updatedProfile = addXP(legendAch.xpReward, updatedProfile);
              addToast({
                type: 'achievement',
                title: 'ACHIEVEMENT UNLOCKED!',
                message: `${legendAch.title} (+${legendAch.xpReward} XP)`,
                icon: legendAch.icon,
                duration: 5000,
              });
            }
          }

          const { nextAchievements, nextProfile: finalProfile } = checkAchievements(
            nextStats,
            achievementsToTest,
            updatedProfile
          );
          
          updatedProfile = finalProfile;
          saveState(updatedProfile, nextStats, nextAchievements, categories);
          return nextAchievements;
        });

        return updatedProfile;
      });

      return nextStats;
    });

    addToast({
      type: 'info',
      title: 'Drill Completed!',
      message: `Logged +${drillXp} XP. Stats updated.`,
    });
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
