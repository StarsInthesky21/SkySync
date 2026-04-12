import { parseTle, propagateToSky, tleToElements } from "../satelliteTracking";

const ISS_TLE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   24081.58101852  .00017389  00000+0  31049-3 0  9996",
  "2 25544  51.6417  16.7253 0004416 178.2849 283.4521 15.49820936444327",
].join("\n");

describe("satelliteTracking", () => {
  it("parses well-formed TLE blocks", () => {
    const records = parseTle(ISS_TLE);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("ISS (ZARYA)");
    expect(records[0].line1.startsWith("1 ")).toBe(true);
  });

  it("extracts orbital elements within expected ranges", () => {
    const rec = parseTle(ISS_TLE)[0];
    const el = tleToElements(rec);
    expect(el.inclinationDeg).toBeCloseTo(51.6417, 3);
    expect(el.meanMotionRevsPerDay).toBeGreaterThan(15);
    expect(el.meanMotionRevsPerDay).toBeLessThan(16);
    expect(el.eccentricity).toBeLessThan(0.01);
  });

  it("propagates ISS to a plausible altitude near 400 km", () => {
    const rec = parseTle(ISS_TLE)[0];
    const sample = propagateToSky(rec, new Date(Date.UTC(2024, 2, 21, 14, 0, 0)));
    expect(sample.altitudeKm).toBeGreaterThan(350);
    expect(sample.altitudeKm).toBeLessThan(480);
  });

  it("returns horizon coords when observer is provided", () => {
    const rec = parseTle(ISS_TLE)[0];
    const sample = propagateToSky(rec, new Date(Date.UTC(2024, 2, 21, 14, 0, 0)), {
      latitudeDeg: 37.7,
      longitudeDeg: -122.4,
    });
    expect(sample.horizon).toBeDefined();
    expect(sample.horizon?.altitudeDeg).toBeGreaterThanOrEqual(-90);
    expect(sample.horizon?.altitudeDeg).toBeLessThanOrEqual(90);
  });
});
