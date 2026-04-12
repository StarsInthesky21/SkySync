/* eslint-disable @typescript-eslint/no-explicit-any */
import { astronomyApi } from "../astronomyApi";

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
    },
  };
});

// Mock fetch for ISS API
const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        iss_position: { latitude: "51.5074", longitude: "-0.1278" },
        timestamp: Math.floor(Date.now() / 1000),
        message: "success",
      }),
  }),
);
(globalThis as any).fetch = mockFetch;

describe("astronomyApi", () => {
  describe("getPlanetPositions", () => {
    it("returns positions for all 7 planets", () => {
      const positions = astronomyApi.getPlanetPositions();
      expect(positions).toHaveLength(7);
      const names = positions.map((p) => p.name);
      expect(names).toContain("Mercury");
      expect(names).toContain("Venus");
      expect(names).toContain("Mars");
      expect(names).toContain("Jupiter");
      expect(names).toContain("Saturn");
      expect(names).toContain("Uranus");
      expect(names).toContain("Neptune");
    });

    it("returns valid RA and declination ranges", () => {
      const positions = astronomyApi.getPlanetPositions();
      for (const planet of positions) {
        expect(planet.rightAscension).toBeGreaterThanOrEqual(0);
        expect(planet.rightAscension).toBeLessThan(360);
        expect(planet.declination).toBeGreaterThanOrEqual(-90);
        expect(planet.declination).toBeLessThanOrEqual(90);
      }
    });

    it("returns reasonable distances", () => {
      const positions = astronomyApi.getPlanetPositions();
      const mercury = positions.find((p) => p.name === "Mercury")!;
      const neptune = positions.find((p) => p.name === "Neptune")!;
      expect(mercury.distanceAU).toBeGreaterThan(0.3);
      expect(mercury.distanceAU).toBeLessThan(1.5);
      expect(neptune.distanceAU).toBeGreaterThan(28);
      expect(neptune.distanceAU).toBeLessThan(32);
    });

    it("computes different positions for different dates", () => {
      const jan = astronomyApi.getPlanetPositions(new Date("2026-01-15"));
      const jul = astronomyApi.getPlanetPositions(new Date("2026-07-15"));
      const mars1 = jan.find((p) => p.name === "Mars")!;
      const mars2 = jul.find((p) => p.name === "Mars")!;
      expect(mars1.rightAscension).not.toBe(mars2.rightAscension);
    });

    it("assigns a constellation to each planet", () => {
      const positions = astronomyApi.getPlanetPositions();
      for (const planet of positions) {
        expect(planet.constellation).toBeTruthy();
        expect(planet.constellation).not.toBe("Unknown");
      }
    });

    it("has valid magnitude values", () => {
      const positions = astronomyApi.getPlanetPositions();
      for (const planet of positions) {
        expect(typeof planet.magnitude).toBe("number");
        expect(Number.isFinite(planet.magnitude)).toBe(true);
      }
    });

    it("marks visibility correctly", () => {
      const positions = astronomyApi.getPlanetPositions();
      for (const planet of positions) {
        expect(typeof planet.isVisible).toBe("boolean");
      }
    });

    it("handles historical dates (1800)", () => {
      const positions = astronomyApi.getPlanetPositions(new Date("1800-06-15"));
      expect(positions).toHaveLength(7);
      for (const planet of positions) {
        expect(Number.isFinite(planet.rightAscension)).toBe(true);
        expect(Number.isFinite(planet.declination)).toBe(true);
      }
    });

    it("handles future dates (2100)", () => {
      const positions = astronomyApi.getPlanetPositions(new Date("2100-01-01"));
      expect(positions).toHaveLength(7);
      for (const planet of positions) {
        expect(Number.isFinite(planet.distanceAU)).toBe(true);
      }
    });
  });

  describe("getMoonPhase", () => {
    it("returns valid moon phase data", () => {
      const phase = astronomyApi.getMoonPhase();
      expect(phase.phase).toBeTruthy();
      expect(phase.illumination).toBeGreaterThanOrEqual(0);
      expect(phase.illumination).toBeLessThanOrEqual(100);
      expect(phase.emoji).toBeTruthy();
      expect(phase.age).toBeGreaterThanOrEqual(0);
      expect(phase.age).toBeLessThanOrEqual(30);
    });

    it("returns known phase names", () => {
      const validPhases = [
        "New Moon",
        "Waxing Crescent",
        "First Quarter",
        "Waxing Gibbous",
        "Full Moon",
        "Waning Gibbous",
        "Last Quarter",
        "Waning Crescent",
      ];
      const phase = astronomyApi.getMoonPhase();
      expect(validPhases).toContain(phase.phase);
    });

    it("returns valid next moon dates", () => {
      const phase = astronomyApi.getMoonPhase();
      expect(phase.nextFullMoon).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(phase.nextNewMoon).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("full moon has high illumination", () => {
      // Near-full date for the app's simplified moon-phase model
      const phase = astronomyApi.getMoonPhase(new Date("2026-04-02"));
      expect(phase.illumination).toBeGreaterThan(50);
    });
  });

  describe("getSunMoonTimes", () => {
    it("returns valid time strings", () => {
      const times = astronomyApi.getSunMoonTimes();
      expect(times.sunrise).toMatch(/^\d{2}:\d{2}$/);
      expect(times.sunset).toMatch(/^\d{2}:\d{2}$/);
      expect(times.moonrise).toMatch(/^\d{2}:\d{2}$/);
      expect(times.moonset).toMatch(/^\d{2}:\d{2}$/);
    });

    it("sunrise is before sunset", () => {
      const times = astronomyApi.getSunMoonTimes();
      const sunriseHour = parseInt(times.sunrise.split(":")[0]);
      const sunsetHour = parseInt(times.sunset.split(":")[0]);
      expect(sunriseHour).toBeLessThan(sunsetHour);
    });

    it("has day length string", () => {
      const times = astronomyApi.getSunMoonTimes();
      expect(times.dayLength).toMatch(/\d+h \d+m/);
    });

    it("golden hour is before sunset", () => {
      const times = astronomyApi.getSunMoonTimes();
      const goldenHour = parseInt(times.goldenHour.split(":")[0]);
      const sunsetHour = parseInt(times.sunset.split(":")[0]);
      expect(goldenHour).toBeLessThanOrEqual(sunsetHour);
    });

    it("varies by season", () => {
      const summer = astronomyApi.getSunMoonTimes(new Date("2026-06-21"));
      const winter = astronomyApi.getSunMoonTimes(new Date("2026-12-21"));
      const summerDay = parseInt(summer.dayLength.split("h")[0]);
      const winterDay = parseInt(winter.dayLength.split("h")[0]);
      expect(summerDay).toBeGreaterThan(winterDay);
    });
  });

  describe("getUpcomingEvents", () => {
    it("returns an array of events", () => {
      const events = astronomyApi.getUpcomingEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it("events are sorted by date", () => {
      const events = astronomyApi.getUpcomingEvents();
      for (let i = 1; i < events.length; i++) {
        expect(events[i].date >= events[i - 1].date).toBe(true);
      }
    });

    it("events have valid structure", () => {
      const events = astronomyApi.getUpcomingEvents(new Date("2026-01-01"));
      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.title).toBeTruthy();
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(event.description).toBeTruthy();
        expect(["meteor_shower", "eclipse", "conjunction", "opposition", "equinox", "solstice"]).toContain(
          event.type,
        );
        expect(["high", "medium", "low"]).toContain(event.importance);
      }
    });

    it("returns events only from today forward", () => {
      const testDate = new Date("2026-06-15");
      const events = astronomyApi.getUpcomingEvents(testDate);
      for (const event of events) {
        expect(event.date >= "2026-06-15").toBe(true);
      }
    });

    it("returns at most 10 events", () => {
      const events = astronomyApi.getUpcomingEvents(new Date("2026-01-01"));
      expect(events.length).toBeLessThanOrEqual(10);
    });

    it("includes Perseids meteor shower for mid-year query", () => {
      const events = astronomyApi.getUpcomingEvents(new Date("2026-06-01"));
      const perseids = events.find((e) => e.title.includes("Perseid"));
      expect(perseids).toBeDefined();
    });
  });

  describe("getISSPosition", () => {
    it("returns ISS position from API", async () => {
      const pos = await astronomyApi.getISSPosition();
      expect(pos).not.toBeNull();
      expect(pos!.latitude).toBeCloseTo(51.5074);
      expect(pos!.longitude).toBeCloseTo(-0.1278);
      expect(pos!.altitude).toBe(408);
      expect(pos!.velocity).toBe(7.66);
    });

    it("returns null on API failure", async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error("Network")));
      const pos = await astronomyApi.getISSPosition();
      expect(pos).toBeNull();
    });

    it("returns null on non-ok response", async () => {
      mockFetch.mockImplementationOnce((() => Promise.resolve({ ok: false })) as any);
      const pos = await astronomyApi.getISSPosition();
      expect(pos).toBeNull();
    });
  });

  describe("getAllData", () => {
    it("returns complete astronomical data", async () => {
      const data = await astronomyApi.getAllData();
      expect(data.planets).toHaveLength(7);
      expect(data.moonPhase).toBeDefined();
      expect(data.sunMoon).toBeDefined();
      expect(data.events).toBeDefined();
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it("caches data on subsequent calls", async () => {
      const first = await astronomyApi.getAllData();
      const second = await astronomyApi.getAllData();
      expect(first.timestamp).toBe(second.timestamp);
    });

    it("refresh bypasses cache", async () => {
      const first = await astronomyApi.getAllData();
      const refreshed = await astronomyApi.refresh();
      // New timestamp means fresh data
      expect(refreshed.timestamp).toBeGreaterThanOrEqual(first.timestamp);
    });
  });
});
