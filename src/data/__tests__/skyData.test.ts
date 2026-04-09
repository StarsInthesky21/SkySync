import {
  skyObjects,
  constellations,
  myths,
  guidedTargets,
  badges,
  dailyChallenges,
  initialRooms,
  initialGlobalChat,
  viewpoints,
  formatTimestamp,
} from "../skyData";

describe("skyData", () => {
  describe("skyObjects", () => {
    it("has a reasonable number of objects", () => {
      expect(skyObjects.length).toBeGreaterThan(20);
    });

    it("all objects have required fields", () => {
      for (const obj of skyObjects) {
        expect(obj.id).toBeTruthy();
        expect(obj.name).toBeTruthy();
        expect(["star", "planet", "satellite", "meteor"]).toContain(obj.kind);
        expect(obj.description).toBeTruthy();
        expect(obj.distanceFromEarth).toBeTruthy();
        expect(typeof obj.longitude).toBe("number");
        expect(typeof obj.latitude).toBe("number");
        expect(typeof obj.magnitude).toBe("number");
        expect(typeof obj.motionFactor).toBe("number");
        expect(obj.scientificFacts.length).toBeGreaterThanOrEqual(2);
        expect(obj.color).toMatch(/^#/);
      }
    });

    it("has unique ids", () => {
      const ids = skyObjects.map((o) => o.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("has all planet types", () => {
      const planets = skyObjects.filter((o) => o.kind === "planet");
      expect(planets.length).toBeGreaterThanOrEqual(5);
      const planetNames = planets.map((p) => p.name);
      expect(planetNames).toContain("Venus");
      expect(planetNames).toContain("Mars");
      expect(planetNames).toContain("Jupiter");
      expect(planetNames).toContain("Saturn");
    });

    it("has satellites", () => {
      const satellites = skyObjects.filter((o) => o.kind === "satellite");
      expect(satellites.length).toBeGreaterThanOrEqual(2);
    });

    it("has meteor radiants", () => {
      const meteors = skyObjects.filter((o) => o.kind === "meteor");
      expect(meteors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("constellations", () => {
    it("has at least 3 constellations", () => {
      expect(constellations.length).toBeGreaterThanOrEqual(3);
    });

    it("all constellation star refs exist in skyObjects", () => {
      const objectIds = new Set(skyObjects.map((o) => o.id));
      for (const c of constellations) {
        for (const starId of c.starIds) {
          expect(objectIds.has(starId)).toBe(true);
        }
      }
    });

    it("has Orion constellation", () => {
      const orion = constellations.find((c) => c.id === "orion");
      expect(orion).toBeDefined();
      expect(orion?.starIds.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("myths", () => {
    it("has stories for constellations with storyIds", () => {
      const storyIds = constellations.filter((c) => c.storyId).map((c) => c.storyId);
      for (const storyId of storyIds) {
        const story = myths.find((m) => m.id === storyId);
        expect(story).toBeDefined();
        expect(story?.frames.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("guidedTargets", () => {
    it("all target objects exist in skyObjects", () => {
      const objectIds = new Set(skyObjects.map((o) => o.id));
      for (const target of guidedTargets) {
        expect(objectIds.has(target.objectId)).toBe(true);
      }
    });
  });

  describe("badges", () => {
    it("has valid badge structure", () => {
      for (const badge of badges) {
        expect(badge.targetCount).toBeGreaterThan(0);
        expect(["planets", "constellations", "satellites"]).toContain(badge.category);
      }
    });
  });

  describe("dailyChallenges", () => {
    it("has valid challenge structure", () => {
      for (const challenge of dailyChallenges) {
        expect(challenge.xpValue).toBeGreaterThan(0);
        expect(["discover", "story", "track"]).toContain(challenge.type);
      }
    });

    it("challenge objects exist in skyObjects", () => {
      const objectIds = new Set(skyObjects.map((o) => o.id));
      for (const challenge of dailyChallenges) {
        if (challenge.objectId) {
          expect(objectIds.has(challenge.objectId)).toBe(true);
        }
      }
    });
  });

  describe("initialRooms", () => {
    it("has at least one initial room", () => {
      expect(initialRooms.length).toBeGreaterThanOrEqual(1);
    });

    it("initial room has valid structure", () => {
      const room = initialRooms[0];
      expect(room.id).toBeTruthy();
      expect(room.roomCode).toMatch(/^SKY-\d{3}$/);
      expect(room.state.participants.length).toBeGreaterThan(0);
      expect(room.chat.length).toBeGreaterThan(0);
      for (const msg of room.chat) {
        expect(typeof msg.timestamp).toBe("number");
      }
    });
  });

  describe("initialGlobalChat", () => {
    it("has initial messages with timestamps", () => {
      expect(initialGlobalChat.length).toBeGreaterThan(0);
      for (const msg of initialGlobalChat) {
        expect(typeof msg.timestamp).toBe("number");
        expect(msg.timestampLabel).toBeTruthy();
      }
    });
  });

  describe("viewpoints", () => {
    it("has earth, mars, and moon", () => {
      const ids = viewpoints.map((v) => v.id);
      expect(ids).toContain("earth");
      expect(ids).toContain("mars");
      expect(ids).toContain("moon");
    });
  });

  describe("formatTimestamp", () => {
    it("returns 'Just now' for recent timestamps", () => {
      expect(formatTimestamp(Date.now() - 5000)).toBe("Just now");
    });

    it("returns minutes ago for timestamps within an hour", () => {
      const result = formatTimestamp(Date.now() - 300000); // 5 min ago
      expect(result).toMatch(/\dm ago/);
    });

    it("returns hours ago for timestamps within a day", () => {
      const result = formatTimestamp(Date.now() - 7200000); // 2 hours ago
      expect(result).toMatch(/\dh ago/);
    });

    it("returns a date string for old timestamps", () => {
      const result = formatTimestamp(Date.now() - 172800000); // 2 days ago
      expect(result).toMatch(/\d/); // Contains some date-like format
    });
  });
});
