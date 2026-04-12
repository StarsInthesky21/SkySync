import { storage } from "../storage";

// Mock AsyncStorage with controllable behavior
const store: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      for (const k of keys) delete store[k];
      return Promise.resolve();
    }),
  },
}));

describe("storage edge cases", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it("handles corrupted JSON gracefully", async () => {
    store["@skysync/user_profile"] = "not valid json{{{";
    const profile = await storage.getUserProfile();
    expect(profile).toBeDefined();
    expect(profile.username).toBeTruthy();
    expect(profile.xp).toBe(0);
  });

  it("handles missing required fields by merging defaults", async () => {
    store["@skysync/user_profile"] = JSON.stringify({ username: "Partial" });
    const profile = await storage.getUserProfile();
    expect(profile.username).toBe("Partial");
    expect(profile.xp).toBe(0);
    expect(Array.isArray(profile.planetsDiscovered)).toBe(true);
  });

  it("handles array stored instead of object", async () => {
    store["@skysync/badge_progress"] = JSON.stringify([1, 2, 3]);
    const badges = await storage.getBadgeProgress();
    expect(badges.planetsDiscovered).toEqual([]);
  });

  it("handles null stored value", async () => {
    store["@skysync/challenge_progress"] = "null";
    const challenges = await storage.getChallengeProgress();
    expect(challenges.completedIds).toEqual([]);
    expect(challenges.totalXpEarned).toBe(0);
  });

  it("handles empty object", async () => {
    store["@skysync/user_profile"] = JSON.stringify({});
    const profile = await storage.getUserProfile();
    // Should merge defaults for missing fields
    expect(profile.xp).toBe(0);
    expect(Array.isArray(profile.planetsDiscovered)).toBe(true);
  });

  it("preserves valid stored data", async () => {
    const validProfile = {
      username: "ValidUser",
      xp: 999,
      joinedAt: "2026-01-01",
      planetsDiscovered: ["jupiter"],
      constellationsTraced: [],
      satellitesTracked: ["iss"],
      challengesCompleted: [],
      totalStarsViewed: 50,
    };
    store["@skysync/user_profile"] = JSON.stringify(validProfile);
    const profile = await storage.getUserProfile();
    expect(profile.username).toBe("ValidUser");
    expect(profile.xp).toBe(999);
    expect(profile.planetsDiscovered).toEqual(["jupiter"]);
  });
});
