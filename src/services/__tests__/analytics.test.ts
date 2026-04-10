import { analytics } from "../analytics";

// Mock AsyncStorage
const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => { mockStore[key] = value; return Promise.resolve(); }),
    removeItem: jest.fn((key: string) => { delete mockStore[key]; return Promise.resolve(); }),
  },
}));

describe("analytics", () => {
  beforeEach(async () => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
    await analytics.init();
  });

  afterEach(async () => {
    await analytics.endSession();
  });

  describe("init", () => {
    it("creates a session", () => {
      const summary = analytics.getSessionSummary();
      expect(summary).not.toBeNull();
      expect(summary!.sessionId).toMatch(/^s-/);
      expect(summary!.events).toBeGreaterThan(0); // session_start
    });
  });

  describe("track", () => {
    it("buffers events to AsyncStorage", async () => {
      await analytics.track("test_event", { key: "value" });
      const buffer = JSON.parse(mockStore["@skysync/analytics_buffer"]);
      expect(buffer.length).toBeGreaterThan(0);
      const testEvent = buffer.find((e: { name: string }) => e.name === "test_event");
      expect(testEvent).toBeDefined();
      expect(testEvent.properties.key).toBe("value");
    });

    it("includes session metadata in events", async () => {
      await analytics.track("test_event");
      const buffer = JSON.parse(mockStore["@skysync/analytics_buffer"]);
      const event = buffer.find((e: { name: string }) => e.name === "test_event");
      expect(event.sessionId).toBeTruthy();
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.properties.session_event_count).toBeGreaterThan(0);
    });

    it("increments event count", async () => {
      await analytics.track("event_1");
      await analytics.track("event_2");
      await analytics.track("event_3");
      const summary = analytics.getSessionSummary();
      // session_start + 3 events = 4
      expect(summary!.events).toBe(4);
    });
  });

  describe("screenView", () => {
    it("tracks screen views with count", async () => {
      await analytics.screenView("Sky");
      await analytics.screenView("Social");
      const summary = analytics.getSessionSummary();
      expect(summary!.screens).toBe(2);
    });

    it("includes screen name in event", async () => {
      await analytics.screenView("Profile");
      const buffer = JSON.parse(mockStore["@skysync/analytics_buffer"]);
      const screenEvent = buffer.find((e: { name: string; properties: { screen: string } }) => e.name === "screen_view" && e.properties.screen === "Profile");
      expect(screenEvent).toBeDefined();
    });
  });

  describe("objectDiscovered", () => {
    it("tracks object discovery with details", async () => {
      await analytics.objectDiscovered("jupiter", "planet", "Jupiter");
      const buffer = JSON.parse(mockStore["@skysync/analytics_buffer"]);
      const event = buffer.find((e: { name: string }) => e.name === "object_discovered");
      expect(event).toBeDefined();
      expect(event.properties.objectId).toBe("jupiter");
      expect(event.properties.objectKind).toBe("planet");
    });
  });

  describe("challengeCompleted", () => {
    it("tracks challenge completion with XP", async () => {
      await analytics.challengeCompleted("challenge-1", 50);
      const buffer = JSON.parse(mockStore["@skysync/analytics_buffer"]);
      const event = buffer.find((e: { name: string }) => e.name === "challenge_completed");
      expect(event.properties.challengeId).toBe("challenge-1");
      expect(event.properties.xpEarned).toBe(50);
    });
  });

  describe("roomAction", () => {
    it("tracks room creation", async () => {
      await analytics.roomAction("create", "SKY-ABC123");
      const buffer = JSON.parse(mockStore["@skysync/analytics_buffer"]);
      const event = buffer.find((e: { name: string }) => e.name === "room_action");
      expect(event.properties.action).toBe("create");
      expect(event.properties.roomCode).toBe("SKY-ABC123");
    });
  });

  describe("flush", () => {
    it("clears buffer after flush", async () => {
      await analytics.track("test");
      expect(mockStore["@skysync/analytics_buffer"]).toBeTruthy();
      await analytics.flush();
      expect(mockStore["@skysync/analytics_buffer"]).toBeUndefined();
    });
  });

  describe("endSession", () => {
    it("tracks session end with summary", async () => {
      await analytics.screenView("Sky");
      await analytics.track("custom_event");
      await analytics.endSession();
      // Session should be null after ending
      expect(analytics.getSessionSummary()).toBeNull();
    });
  });

  describe("getSessionSummary", () => {
    it("returns null when no session", async () => {
      await analytics.endSession();
      expect(analytics.getSessionSummary()).toBeNull();
    });

    it("returns valid summary during session", () => {
      const summary = analytics.getSessionSummary();
      expect(summary).not.toBeNull();
      expect(summary!.duration).toBeGreaterThanOrEqual(0);
      expect(typeof summary!.events).toBe("number");
      expect(typeof summary!.screens).toBe("number");
    });
  });
});
