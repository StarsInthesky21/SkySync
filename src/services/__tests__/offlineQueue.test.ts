import { offlineQueue } from "../offlineQueue";

const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => { mockStore[key] = value; return Promise.resolve(); }),
    removeItem: jest.fn((key: string) => { delete mockStore[key]; return Promise.resolve(); }),
  },
}));

describe("offlineQueue", () => {
  beforeEach(async () => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  });

  describe("enqueue", () => {
    it("adds an action to the queue", async () => {
      await offlineQueue.enqueue({ type: "room_message", payload: { text: "hello" } });
      const count = await offlineQueue.count();
      expect(count).toBe(1);
    });

    it("queues multiple actions", async () => {
      await offlineQueue.enqueue({ type: "room_message", payload: { text: "msg1" } });
      await offlineQueue.enqueue({ type: "global_message", payload: { text: "msg2" } });
      await offlineQueue.enqueue({ type: "note", payload: { text: "note" } });
      const count = await offlineQueue.count();
      expect(count).toBe(3);
    });
  });

  describe("flush", () => {
    it("processes all actions successfully", async () => {
      await offlineQueue.enqueue({ type: "room_message", payload: { text: "hello" } });
      await offlineQueue.enqueue({ type: "global_message", payload: { text: "world" } });

      const flushed = await offlineQueue.flush(async () => true);
      expect(flushed).toBe(2);

      const remaining = await offlineQueue.count();
      expect(remaining).toBe(0);
    });

    it("keeps failed actions in queue", async () => {
      await offlineQueue.enqueue({ type: "room_message", payload: { text: "will_fail" } });
      await offlineQueue.enqueue({ type: "global_message", payload: { text: "will_succeed" } });

      let callCount = 0;
      const flushed = await offlineQueue.flush(async () => {
        callCount++;
        return callCount > 1; // First fails, second succeeds
      });

      expect(flushed).toBe(1);
      const remaining = await offlineQueue.count();
      expect(remaining).toBe(1);
    });

    it("returns 0 when queue is empty", async () => {
      const flushed = await offlineQueue.flush(async () => true);
      expect(flushed).toBe(0);
    });
  });

  describe("count", () => {
    it("returns 0 for empty queue", async () => {
      const count = await offlineQueue.count();
      expect(count).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all queued actions", async () => {
      await offlineQueue.enqueue({ type: "room_message", payload: { text: "hello" } });
      await offlineQueue.enqueue({ type: "global_message", payload: { text: "world" } });
      await offlineQueue.clear();
      const count = await offlineQueue.count();
      expect(count).toBe(0);
    });
  });
});
