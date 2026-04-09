import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  USER_PROFILE: "@skysync/user_profile",
  ROOMS: "@skysync/rooms",
  GLOBAL_CHAT: "@skysync/global_chat",
  BADGE_PROGRESS: "@skysync/badge_progress",
  CHALLENGE_PROGRESS: "@skysync/challenge_progress",
  SETTINGS: "@skysync/settings",
} as const;

export type UserProfile = {
  username: string;
  xp: number;
  joinedAt: string;
  planetsDiscovered: string[];
  constellationsTraced: string[];
  satellitesTracked: string[];
  challengesCompleted: string[];
  totalStarsViewed: number;
};

export type BadgeProgress = {
  planetsDiscovered: string[];
  constellationsTraced: string[];
  satellitesTracked: string[];
};

export type ChallengeProgress = {
  completedIds: string[];
  lastResetDate: string;
  totalXpEarned: number;
};

export type AppSettings = {
  voiceGuideEnabled: boolean;
  lastViewpoint: string;
};

const DEFAULT_PROFILE: UserProfile = {
  username: `Stargazer${Math.floor(100 + Math.random() * 900)}`,
  xp: 0,
  joinedAt: new Date().toISOString(),
  planetsDiscovered: [],
  constellationsTraced: [],
  satellitesTracked: [],
  challengesCompleted: [],
  totalStarsViewed: 0,
};

const DEFAULT_BADGE_PROGRESS: BadgeProgress = {
  planetsDiscovered: [],
  constellationsTraced: [],
  satellitesTracked: [],
};

const DEFAULT_CHALLENGE_PROGRESS: ChallengeProgress = {
  completedIds: [],
  lastResetDate: new Date().toISOString().slice(0, 10),
  totalXpEarned: 0,
};

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function setJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage write failed silently - app continues with in-memory state
  }
}

export const storage = {
  async getUserProfile(): Promise<UserProfile> {
    return getJson(KEYS.USER_PROFILE, DEFAULT_PROFILE);
  },
  async saveUserProfile(profile: UserProfile): Promise<void> {
    await setJson(KEYS.USER_PROFILE, profile);
  },

  async getBadgeProgress(): Promise<BadgeProgress> {
    return getJson(KEYS.BADGE_PROGRESS, DEFAULT_BADGE_PROGRESS);
  },
  async saveBadgeProgress(progress: BadgeProgress): Promise<void> {
    await setJson(KEYS.BADGE_PROGRESS, progress);
  },

  async getChallengeProgress(): Promise<ChallengeProgress> {
    return getJson(KEYS.CHALLENGE_PROGRESS, DEFAULT_CHALLENGE_PROGRESS);
  },
  async saveChallengeProgress(progress: ChallengeProgress): Promise<void> {
    await setJson(KEYS.CHALLENGE_PROGRESS, progress);
  },

  async getSettings(): Promise<AppSettings> {
    return getJson(KEYS.SETTINGS, { voiceGuideEnabled: true, lastViewpoint: "earth" });
  },
  async saveSettings(settings: AppSettings): Promise<void> {
    await setJson(KEYS.SETTINGS, settings);
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS));
    } catch {
      // Clear failed silently
    }
  },
};
