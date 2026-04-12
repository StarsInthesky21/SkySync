import {
  equatorialToHorizon,
  gmstDegrees,
  localSiderealDegrees,
  moonEquatorial,
  moonIllumination,
  planetEquatorial,
  sunEquatorial,
} from "../planetEphemeris";

describe("planetEphemeris", () => {
  const J2000_NOON = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

  it("computes GMST near 18.697374h at J2000 noon", () => {
    const gmst = gmstDegrees(J2000_NOON);
    // Expected ~280.46° (18.697374h * 15)
    expect(gmst).toBeGreaterThan(279);
    expect(gmst).toBeLessThan(282);
  });

  it("computes local sidereal time with longitude offset", () => {
    const gmst = gmstDegrees(J2000_NOON);
    const lst = localSiderealDegrees(J2000_NOON, 90);
    expect(Math.abs((lst - gmst - 90 + 360) % 360)).toBeLessThan(0.001);
  });

  it("places the Sun near RA 280° and Dec -23° around winter solstice", () => {
    const d = new Date(Date.UTC(2024, 11, 21, 12, 0, 0));
    const sun = sunEquatorial(d);
    expect(sun.declinationDeg).toBeLessThan(-22);
    expect(sun.declinationDeg).toBeGreaterThan(-24);
    expect(sun.rightAscensionDeg).toBeGreaterThan(265);
    expect(sun.rightAscensionDeg).toBeLessThan(275);
  });

  it("computes Moon illumination between 0 and 1", () => {
    const illum = moonIllumination(new Date());
    expect(illum).toBeGreaterThanOrEqual(0);
    expect(illum).toBeLessThanOrEqual(1);
  });

  it("places Jupiter within plausible RA range at known date", () => {
    const d = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    const jup = planetEquatorial("jupiter", d);
    // Jupiter was in Aries/Taurus region early 2024 — RA 35-50°
    expect(jup.rightAscensionDeg).toBeGreaterThan(20);
    expect(jup.rightAscensionDeg).toBeLessThan(70);
    expect(Math.abs(jup.declinationDeg)).toBeLessThan(30);
    expect(jup.magnitude).toBeLessThan(-1);
  });

  it("converts a high-declination star to positive altitude from north pole", () => {
    const polaris = { rightAscensionDeg: 37.9, declinationDeg: 89.3, distanceAu: 0, magnitude: 2 };
    const horizon = equatorialToHorizon(polaris, new Date(), 90, 0);
    expect(horizon.altitudeDeg).toBeGreaterThan(85);
  });

  it("reports moon below horizon at antipode", () => {
    const d = new Date(Date.UTC(2024, 3, 1, 0, 0, 0));
    const moon = moonEquatorial(d);
    const h1 = equatorialToHorizon(moon, d, 45, 0);
    const h2 = equatorialToHorizon(moon, d, -45, 180);
    // At least one of the antipodal points has the Moon below the horizon.
    expect(h1.altitudeDeg * h2.altitudeDeg).toBeLessThan(0);
  });
});
