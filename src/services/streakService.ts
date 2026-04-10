import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "@skysync/streak";

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalDaysActive: number;
  level: number;
  xpToNextLevel: number;
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: "",
  totalDaysActive: 0,
  level: 1,
  xpToNextLevel: 100,
};

function getLevel(totalXp: number): { level: number; xpToNextLevel: number } {
  // Each level requires progressively more XP: 100, 200, 350, 550, 800...
  let level = 1;
  let xpNeeded = 100;
  let accumulated = 0;

  while (accumulated + xpNeeded <= totalXp) {
    accumulated += xpNeeded;
    level += 1;
    xpNeeded = Math.floor(100 * (1 + (level - 1) * 0.5));
  }

  return { level, xpToNextLevel: xpNeeded - (totalXp - accumulated) };
}

export const streakService = {
  async getStreak(): Promise<StreakData> {
    try {
      const raw = await AsyncStorage.getItem(STREAK_KEY);
      if (!raw) return DEFAULT_STREAK;
      return JSON.parse(raw) as StreakData;
    } catch {
      return DEFAULT_STREAK;
    }
  },

  async recordActivity(totalXp: number): Promise<StreakData> {
    const today = new Date().toISOString().slice(0, 10);
    const streak = await this.getStreak();

    if (streak.lastActiveDate === today) {
      // Already active today, just update level
      const levelInfo = getLevel(totalXp);
      const updated = { ...streak, ...levelInfo };
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updated));
      return updated;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newStreak: number;
    if (streak.lastActiveDate === yesterdayStr) {
      newStreak = streak.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const levelInfo = getLevel(totalXp);
    const updated: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(streak.longestStreak, newStreak),
      lastActiveDate: today,
      totalDaysActive: streak.totalDaysActive + 1,
      ...levelInfo,
    };

    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updated));
    return updated;
  },
};
