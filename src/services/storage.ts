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

function generateUsername(): string {
  const adjectives = ["Cosmic", "Stellar", "Astral", "Lunar", "Solar", "Nebula", "Orbit", "Nova", "Quasar", "Pulsar"];
  const nouns = ["Gazer", "Walker", "Seeker", "Pilot", "Scout", "Voyager", "Watcher", "Ranger", "Drifter", "Hunter"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}

const DEFAULT_PROFILE: UserProfile = {
  username: generateUsername(),
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

function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRequiredFields(obj: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => field in obj);
}

const PROFILE_REQUIRED_FIELDS = ["username", "xp", "planetsDiscovered", "satellitesTracked", "totalStarsViewed"];
const BADGE_REQUIRED_FIELDS = ["planetsDiscovered", "constellationsTraced", "satellitesTracked"];
const CHALLENGE_REQUIRED_FIELDS = ["completedIds", "lastResetDate", "totalXpEarned"];

async function getJson<T>(key: string, fallback: T, requiredFields?: string[]): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidObject(parsed)) {
      console.warn(`[SkySync Storage] Invalid data at ${key}, using defaults`);
      return fallback;
    }
    if (requiredFields && !hasRequiredFields(parsed, requiredFields)) {
      console.warn(`[SkySync Storage] Missing required fields in ${key}, merging with defaults`);
      return { ...fallback, ...parsed } as T;
    }
    return parsed as T;
  } catch (error) {
    console.warn(`[SkySync Storage] Failed to read ${key}:`, error);
    return fallback;
  }
}

async function setJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[SkySync Storage] Failed to write ${key}:`, error);
  }
}

export const storage = {
  async getUserProfile(): Promise<UserProfile> {
    return getJson(KEYS.USER_PROFILE, DEFAULT_PROFILE, PROFILE_REQUIRED_FIELDS);
  },
  async saveUserProfile(profile: UserProfile): Promise<void> {
    await setJson(KEYS.USER_PROFILE, profile);
  },

  async getBadgeProgress(): Promise<BadgeProgress> {
    return getJson(KEYS.BADGE_PROGRESS, DEFAULT_BADGE_PROGRESS, BADGE_REQUIRED_FIELDS);
  },
  async saveBadgeProgress(progress: BadgeProgress): Promise<void> {
    await setJson(KEYS.BADGE_PROGRESS, progress);
  },

  async getChallengeProgress(): Promise<ChallengeProgress> {
    return getJson(KEYS.CHALLENGE_PROGRESS, DEFAULT_CHALLENGE_PROGRESS, CHALLENGE_REQUIRED_FIELDS);
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
    } catch (error) {
      console.warn("[SkySync Storage] Failed to clear:", error);
    }
  },
};
