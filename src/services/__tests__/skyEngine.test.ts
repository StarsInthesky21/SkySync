import {
  renderSkyObjects,
  getConstellationSegments,
  getCustomConstellationSegments,
  findSkyObject,
  getConstellationName,
  getStoryForConstellation,
  focusRotationForObject,
  getVisibleThingsTonight,
  getConstellations,
} from "../skyEngine";
import { SkyTransform } from "@/types/sky";

const baseTransform: SkyTransform = {
  rotation: 0,
  zoom: 1,
  date: new Date("2026-06-15T22:00:00Z"),
  viewpoint: "earth",
};

describe("skyEngine", () => {
  describe("renderSkyObjects", () => {
    it("returns rendered objects with x, y, size, isVisible properties", () => {
      const objects = renderSkyObjects(baseTransform);
      expect(objects.length).toBeGreaterThan(0);
      for (const obj of objects.slice(0, 5)) {
        expect(obj).toHaveProperty("x");
        expect(obj).toHaveProperty("y");
        expect(obj).toHaveProperty("size");
        expect(obj).toHaveProperty("isVisible");
        expect(typeof obj.x).toBe("number");
        expect(typeof obj.y).toBe("number");
        expect(typeof obj.size).toBe("number");
        expect(typeof obj.isVisible).toBe("boolean");
      }
    });

    it("applies zoom to positions", () => {
      const normal = renderSkyObjects({ ...baseTransform, zoom: 1 });
      const zoomed = renderSkyObjects({ ...baseTransform, zoom: 2 });
      const normalObj = normal.find((o) => o.id === "jupiter")!;
      const zoomedObj = zoomed.find((o) => o.id === "jupiter")!;
      // Zoomed positions should differ from normal (spread further from center)
      expect(zoomedObj.x).not.toEqual(normalObj.x);
    });

    it("applies rotation to positions", () => {
      const r0 = renderSkyObjects({ ...baseTransform, rotation: 0 });
      const r90 = renderSkyObjects({ ...baseTransform, rotation: 90 });
      const obj0 = r0.find((o) => o.id === "venus")!;
      const obj90 = r90.find((o) => o.id === "venus")!;
      expect(obj0.x).not.toEqual(obj90.x);
    });

    it("applies viewpoint offsets for mars", () => {
      const earth = renderSkyObjects({ ...baseTransform, viewpoint: "earth" });
      const mars = renderSkyObjects({ ...baseTransform, viewpoint: "mars" });
      const earthJup = earth.find((o) => o.id === "jupiter")!;
      const marsJup = mars.find((o) => o.id === "jupiter")!;
      expect(earthJup.x).not.toEqual(marsJup.x);
    });

    it("handles NaN zoom gracefully", () => {
      const objects = renderSkyObjects({ ...baseTransform, zoom: NaN });
      expect(objects.length).toBeGreaterThan(0);
      for (const obj of objects.slice(0, 3)) {
        expect(Number.isFinite(obj.x)).toBe(true);
        expect(Number.isFinite(obj.y)).toBe(true);
      }
    });

    it("handles extreme zoom values", () => {
      const objects = renderSkyObjects({ ...baseTransform, zoom: 999 });
      expect(objects.length).toBeGreaterThan(0);
    });

    it("handles negative rotation", () => {
      const objects = renderSkyObjects({ ...baseTransform, rotation: -180 });
      expect(objects.length).toBeGreaterThan(0);
    });

    it("includes all sky object kinds", () => {
      const objects = renderSkyObjects(baseTransform);
      const kinds = new Set(objects.map((o) => o.kind));
      expect(kinds.has("star")).toBe(true);
      expect(kinds.has("planet")).toBe(true);
      expect(kinds.has("satellite")).toBe(true);
      expect(kinds.has("meteor")).toBe(true);
    });

    it("calculates size based on magnitude", () => {
      const objects = renderSkyObjects(baseTransform);
      const sirius = objects.find((o) => o.id === "sirius")!;
      const dimStar = objects.find((o) => o.id === "field-star-5")!;
      // Sirius (magnitude -1.46) should be larger than a dim field star
      expect(sirius.size).toBeGreaterThan(dimStar.size);
    });
  });

  describe("getConstellationSegments", () => {
    it("returns segments connecting constellation stars", () => {
      const objects = renderSkyObjects(baseTransform);
      const segments = getConstellationSegments(objects);
      expect(segments.length).toBeGreaterThan(0);
      for (const seg of segments) {
        expect(seg).toHaveProperty("id");
        expect(seg).toHaveProperty("from");
        expect(seg).toHaveProperty("to");
        expect(seg).toHaveProperty("color");
        expect(seg.from).toHaveProperty("x");
        expect(seg.to).toHaveProperty("x");
      }
    });

    it("only includes segments where both stars are visible", () => {
      const objects = renderSkyObjects(baseTransform);
      const segments = getConstellationSegments(objects);
      for (const seg of segments) {
        expect(seg.from.isVisible).toBe(true);
        expect(seg.to.isVisible).toBe(true);
      }
    });
  });

  describe("getCustomConstellationSegments", () => {
    it("returns empty array for empty custom constellations", () => {
      const objects = renderSkyObjects(baseTransform);
      const segments = getCustomConstellationSegments(objects, []);
      expect(segments).toEqual([]);
    });

    it("creates segments for custom constellations", () => {
      const objects = renderSkyObjects(baseTransform);
      const customs = [
        { id: "test-custom", title: "Test Pattern", starIds: ["betelgeuse", "rigel"], color: "#ff0000" },
      ];
      const segments = getCustomConstellationSegments(objects, customs);
      // May or may not have segments depending on visibility
      if (segments.length > 0) {
        expect(segments[0].color).toBe("#ff0000");
      }
    });
  });

  describe("findSkyObject", () => {
    it("finds a known object by id", () => {
      const obj = findSkyObject("jupiter");
      expect(obj).toBeDefined();
      expect(obj?.name).toBe("Jupiter");
      expect(obj?.kind).toBe("planet");
    });

    it("returns undefined for unknown id", () => {
      expect(findSkyObject("nonexistent")).toBeUndefined();
    });

    it("returns undefined for undefined id", () => {
      expect(findSkyObject(undefined)).toBeUndefined();
    });
  });

  describe("getConstellationName", () => {
    it("returns constellation name for known id", () => {
      expect(getConstellationName("orion")).toBe("Orion");
    });

    it("returns undefined for unknown id", () => {
      expect(getConstellationName("fake-constellation")).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
      expect(getConstellationName(undefined)).toBeUndefined();
    });
  });

  describe("getStoryForConstellation", () => {
    it("returns a story for Orion", () => {
      const story = getStoryForConstellation("orion");
      expect(story).toBeDefined();
      expect(story?.title).toBe("Orion The Hunter");
      expect(story?.frames.length).toBeGreaterThan(0);
    });

    it("returns undefined for constellation without story", () => {
      expect(getStoryForConstellation("fake")).toBeUndefined();
    });
  });

  describe("focusRotationForObject", () => {
    it("returns a number for known object", () => {
      const rot = focusRotationForObject("jupiter", new Date(), "earth");
      expect(typeof rot).toBe("number");
      expect(rot).toBeGreaterThanOrEqual(0);
      expect(rot).toBeLessThan(360);
    });

    it("returns 0 for unknown object", () => {
      expect(focusRotationForObject("nonexistent", new Date(), "earth")).toBe(0);
    });
  });

  describe("getVisibleThingsTonight", () => {
    it("returns at most 6 objects", () => {
      const objects = renderSkyObjects(baseTransform);
      const visible = getVisibleThingsTonight(objects);
      expect(visible.length).toBeLessThanOrEqual(6);
    });

    it("prioritizes bright objects", () => {
      const objects = renderSkyObjects(baseTransform);
      const visible = getVisibleThingsTonight(objects);
      if (visible.length > 1) {
        // Should be sorted by magnitude (ascending = brightest first)
        for (let i = 0; i < visible.length - 1; i++) {
          expect(visible[i].magnitude).toBeLessThanOrEqual(visible[i + 1].magnitude);
        }
      }
    });

    it("includes planets and satellites", () => {
      const objects = renderSkyObjects(baseTransform);
      const visible = getVisibleThingsTonight(objects);
      const kinds = new Set(visible.map((o) => o.kind));
      expect(kinds.has("planet") || kinds.has("satellite")).toBe(true);
    });
  });

  describe("getConstellations", () => {
    it("returns all constellations", () => {
      const constellations = getConstellations();
      expect(constellations.length).toBeGreaterThan(0);
      for (const c of constellations) {
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("name");
        expect(c).toHaveProperty("starIds");
        expect(c.starIds.length).toBeGreaterThan(0);
      }
    });
  });
});
