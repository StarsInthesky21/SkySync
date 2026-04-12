import { streakService } from "../streakService";

const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStore[key];
      return Promise.resolve();
    }),
  },
}));

describe("streakService", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  });

  describe("getStreak", () => {
    it("returns default streak when nothing stored", async () => {
      const streak = await streakService.getStreak();
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(0);
      expect(streak.totalDaysActive).toBe(0);
      expect(streak.level).toBe(1);
    });
  });

  describe("recordActivity", () => {
    it("starts a new streak on first activity", async () => {
      const streak = await streakService.recordActivity(0);
      expect(streak.currentStreak).toBe(1);
      expect(streak.totalDaysActive).toBe(1);
      expect(streak.lastActiveDate).toBeTruthy();
    });

    it("does not double-count same day", async () => {
      await streakService.recordActivity(0);
      const second = await streakService.recordActivity(50);
      expect(second.currentStreak).toBe(1);
      expect(second.totalDaysActive).toBe(1);
    });

    it("computes level from XP", async () => {
      const streak = await streakService.recordActivity(250);
      expect(streak.level).toBeGreaterThanOrEqual(2);
    });

    it("calculates XP to next level", async () => {
      const streak = await streakService.recordActivity(0);
      expect(streak.xpToNextLevel).toBeGreaterThan(0);
    });

    it("level 1 needs 100 XP", async () => {
      const streak = await streakService.recordActivity(0);
      expect(streak.level).toBe(1);
      expect(streak.xpToNextLevel).toBe(100);
    });

    it("level 2 at 100 XP", async () => {
      const streak = await streakService.recordActivity(100);
      expect(streak.level).toBe(2);
    });
  });
});
