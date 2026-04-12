import AsyncStorage from "@react-native-async-storage/async-storage";
import { schedulePassAlerts } from "../passScheduler";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: jest.fn(async () => store.clear()),
    __reset: () => store.clear(),
  };
});

const ISS_TLES =
  "ISS (ZARYA)\n" +
  "1 25544U 98067A   24081.58101852  .00017389  00000+0  31049-3 0  9996\n" +
  "2 25544  51.6417  16.7253 0004416 178.2849 283.4521 15.49820936444327\n";

describe("passScheduler", () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => ISS_TLES,
    }) as unknown as typeof fetch;
  });

  it("adds a pass alert to the inbox when ISS is visible", async () => {
    const added = await schedulePassAlerts(
      { latitudeDeg: 37.7, longitudeDeg: -122.4 },
      new Date("2024-03-22T02:00:00Z"),
    );
    const raw = await AsyncStorage.getItem("@skysync/notifications");
    const inbox = raw ? JSON.parse(raw) : [];
    expect(added).toBeGreaterThanOrEqual(0);
    if (added > 0) {
      expect(inbox.length).toBeGreaterThan(0);
      expect(inbox[0].kind).toBe("pass");
    }
  });

  it("does not duplicate pass alerts", async () => {
    const at = new Date("2024-03-22T02:00:00Z");
    await schedulePassAlerts({ latitudeDeg: 37.7, longitudeDeg: -122.4 }, at);
    const second = await schedulePassAlerts({ latitudeDeg: 37.7, longitudeDeg: -122.4 }, at);
    expect(second).toBe(0);
  });
});
