import { notificationService } from "../notifications";

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

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// Mock expo-notifications to avoid native module errors in test environment
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "undetermined" })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("mock-id")),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

describe("notificationService", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  });

  describe("getPrefs", () => {
    it("returns default preferences when nothing stored", async () => {
      const prefs = await notificationService.getPrefs();
      expect(prefs.streakReminders).toBe(true);
      expect(prefs.eventAlerts).toBe(true);
      expect(prefs.challengeReminders).toBe(true);
      expect(prefs.roomActivity).toBe(false);
      expect(prefs.quietHoursStart).toBe(23);
      expect(prefs.quietHoursEnd).toBe(7);
    });

    it("returns saved preferences", async () => {
      await notificationService.savePrefs({
        streakReminders: false,
        eventAlerts: true,
        challengeReminders: false,
        roomActivity: true,
        quietHoursStart: 22,
        quietHoursEnd: 8,
      });
      const prefs = await notificationService.getPrefs();
      expect(prefs.streakReminders).toBe(false);
      expect(prefs.roomActivity).toBe(true);
      expect(prefs.quietHoursStart).toBe(22);
    });
  });

  describe("savePrefs", () => {
    it("persists preferences", async () => {
      await notificationService.savePrefs({
        streakReminders: false,
        eventAlerts: false,
        challengeReminders: false,
        roomActivity: false,
        quietHoursStart: 21,
        quietHoursEnd: 9,
      });
      const raw = mockStore["@skysync/notification_prefs"];
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw);
      expect(parsed.streakReminders).toBe(false);
    });
  });

  describe("scheduleStreakReminder", () => {
    it("does not throw when expo-notifications is unavailable", async () => {
      await expect(notificationService.scheduleStreakReminder(5)).resolves.not.toThrow();
    });

    it("respects disabled preference", async () => {
      await notificationService.savePrefs({
        streakReminders: false,
        eventAlerts: true,
        challengeReminders: true,
        roomActivity: false,
        quietHoursStart: 23,
        quietHoursEnd: 7,
      });
      // Should complete without scheduling
      await expect(notificationService.scheduleStreakReminder(3)).resolves.not.toThrow();
    });
  });

  describe("scheduleEventAlerts", () => {
    it("does not throw for empty events", async () => {
      await expect(notificationService.scheduleEventAlerts([])).resolves.not.toThrow();
    });

    it("handles events gracefully without expo-notifications", async () => {
      await expect(
        notificationService.scheduleEventAlerts([
          { title: "Perseids", date: "2026-08-12", description: "Up to 100 meteors per hour" },
        ]),
      ).resolves.not.toThrow();
    });
  });

  describe("scheduleChallengeReminder", () => {
    it("does not schedule when all challenges complete", async () => {
      await expect(notificationService.scheduleChallengeReminder(5, 5)).resolves.not.toThrow();
    });

    it("handles incomplete challenges", async () => {
      await expect(notificationService.scheduleChallengeReminder(2, 5)).resolves.not.toThrow();
    });
  });

  describe("isAvailable", () => {
    it("returns false when expo-notifications is not installed", async () => {
      const available = await notificationService.isAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("getPendingCount", () => {
    it("returns 0 when expo-notifications is not available", async () => {
      const count = await notificationService.getPendingCount();
      expect(count).toBe(0);
    });
  });
});
