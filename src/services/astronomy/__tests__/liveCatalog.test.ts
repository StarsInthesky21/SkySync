import { buildLiveCatalog } from "../liveCatalog";

describe("liveCatalog", () => {
  it("returns Sun, Moon, and all major planets by default", async () => {
    const list = await buildLiveCatalog({
      date: new Date("2024-06-21T12:00:00Z"),
      includeStars: false,
      includeSatellites: false,
    });
    const ids = list.map((o) => o.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "sun",
        "moon",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
        "uranus",
        "neptune",
      ]),
    );
  });

  it("respects include flags", async () => {
    const list = await buildLiveCatalog({
      date: new Date(),
      includeStars: false,
      includeSun: false,
      includeMoon: false,
      includePlanets: false,
      includeSatellites: false,
    });
    expect(list).toEqual([]);
  });

  it("populated bodies carry live RA and Dec", async () => {
    const list = await buildLiveCatalog({
      date: new Date("2024-06-21T12:00:00Z"),
      includeStars: false,
      includeSatellites: false,
    });
    const jupiter = list.find((o) => o.id === "jupiter");
    expect(jupiter).toBeDefined();
    expect(jupiter!.longitude).toBeGreaterThanOrEqual(0);
    expect(jupiter!.longitude).toBeLessThan(360);
    expect(jupiter!.latitude).toBeGreaterThanOrEqual(-90);
    expect(jupiter!.latitude).toBeLessThanOrEqual(90);
  });
});
