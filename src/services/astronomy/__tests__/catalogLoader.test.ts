import { colorFromColorIndex, parseHygJson, getBundledCatalog } from "../catalogLoader";

describe("catalogLoader", () => {
  it("returns hex color for a range of B-V indices", () => {
    expect(colorFromColorIndex(-0.3)).toBe("#adc8ff");
    expect(colorFromColorIndex(0.2)).toBe("#d4e2ff");
    expect(colorFromColorIndex(0.9)).toBe("#fff4d6");
    expect(colorFromColorIndex(1.5)).toBe("#ffb07b");
    expect(colorFromColorIndex(NaN)).toBe("#d4e2ff");
  });

  it("parses valid HYG JSON rows and filters by magnitude", () => {
    const input = JSON.stringify([
      { id: 1, proper: "Sirius", ra: 6.75, dec: -16.71, mag: -1.46, ci: 0.0, dist: 2.64 },
      { id: 2, proper: "Faint", ra: 10, dec: 0, mag: 8.1, ci: 0.5 },
      { id: 3, proper: "Vega", ra: 18.6, dec: 38.8, mag: 0.03, ci: -0.01 },
    ]);
    const parsed = parseHygJson(input);
    expect(parsed).toHaveLength(2);
    const sirius = parsed[0];
    expect(sirius.name).toBe("Sirius");
    expect(sirius.longitude).toBeCloseTo(6.75 * 15, 3);
    expect(sirius.latitude).toBeCloseTo(-16.71, 3);
    expect(sirius.kind).toBe("star");
  });

  it("handles garbage input without throwing", () => {
    expect(parseHygJson("not json")).toEqual([]);
    expect(parseHygJson("{}")).toEqual([]);
  });

  it("bundled catalog is non-empty", () => {
    expect(getBundledCatalog().length).toBeGreaterThan(100);
  });
});
