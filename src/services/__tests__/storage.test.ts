import { storage } from "../storage";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
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
        for (const key of keys) delete store[key];
        return Promise.resolve();
      }),
    },
  };
});

describe("storage", () => {
  describe("getUserProfile", () => {
    it("returns a default profile when nothing is stored", async () => {
      const profile = await storage.getUserProfile();
      expect(profile).toBeDefined();
      expect(profile.username).toBeTruthy();
      expect(profile.xp).toBe(0);
      expect(profile.planetsDiscovered).toEqual([]);
      expect(profile.satellitesTracked).toEqual([]);
    });

    it("persists and retrieves a profile", async () => {
      const testProfile = {
        username: "TestUser",
        xp: 500,
        joinedAt: "2026-01-01T00:00:00Z",
        planetsDiscovered: ["jupiter", "saturn"],
        constellationsTraced: [],
        satellitesTracked: ["iss"],
        challengesCompleted: ["challenge-1"],
        totalStarsViewed: 42,
      };
      await storage.saveUserProfile(testProfile);
      const retrieved = await storage.getUserProfile();
      expect(retrieved.username).toBe("TestUser");
      expect(retrieved.xp).toBe(500);
      expect(retrieved.planetsDiscovered).toEqual(["jupiter", "saturn"]);
    });
  });

  describe("getBadgeProgress", () => {
    it("returns default badge progress", async () => {
      const progress = await storage.getBadgeProgress();
      expect(progress.planetsDiscovered).toEqual([]);
      expect(progress.constellationsTraced).toEqual([]);
      expect(progress.satellitesTracked).toEqual([]);
    });

    it("persists badge progress", async () => {
      await storage.saveBadgeProgress({
        planetsDiscovered: ["venus"],
        constellationsTraced: ["custom-1"],
        satellitesTracked: [],
      });
      const retrieved = await storage.getBadgeProgress();
      expect(retrieved.planetsDiscovered).toContain("venus");
    });
  });

  describe("getChallengeProgress", () => {
    it("returns default challenge progress", async () => {
      const progress = await storage.getChallengeProgress();
      expect(progress.completedIds).toEqual([]);
      expect(progress.totalXpEarned).toBe(0);
    });

    it("persists challenge progress", async () => {
      await storage.saveChallengeProgress({
        completedIds: ["challenge-saturn"],
        lastResetDate: "2026-04-09",
        totalXpEarned: 180,
      });
      const retrieved = await storage.getChallengeProgress();
      expect(retrieved.completedIds).toContain("challenge-saturn");
      expect(retrieved.totalXpEarned).toBe(180);
    });
  });

  describe("getSettings", () => {
    it("returns default settings", async () => {
      const settings = await storage.getSettings();
      expect(settings.voiceGuideEnabled).toBe(true);
      expect(settings.lastViewpoint).toBe("earth");
    });
  });

  describe("clearAll", () => {
    it("clears all stored data without error", async () => {
      await expect(storage.clearAll()).resolves.toBeUndefined();
    });
  });
});
