import { assessObservingConditions } from "../observingConditions";

describe("observingConditions", () => {
  it("returns poor when the Sun is up", () => {
    const noon = new Date(Date.UTC(2024, 5, 21, 12, 0, 0));
    const result = assessObservingConditions({
      date: noon,
      latitudeDeg: 37.7,
      longitudeDeg: -122.4,
    });
    expect(result.score).toBeLessThan(50);
  });

  it("returns higher scores on a clear moonless night than a cloudy one", () => {
    const midnight = new Date(Date.UTC(2024, 0, 10, 6, 0, 0));
    const clear = assessObservingConditions({
      date: midnight,
      latitudeDeg: 37.7,
      longitudeDeg: -122.4,
      weather: {
        fetchedAt: Date.now(),
        cloudCoverPct: 10,
        humidityPct: 40,
        temperatureC: 12,
        windKph: 8,
        visibilityKm: 20,
        precipitationProbPct: 5,
        sourceUrl: "",
      },
    });
    const cloudy = assessObservingConditions({
      date: midnight,
      latitudeDeg: 37.7,
      longitudeDeg: -122.4,
      weather: {
        fetchedAt: Date.now(),
        cloudCoverPct: 92,
        humidityPct: 95,
        temperatureC: 4,
        windKph: 40,
        visibilityKm: 2,
        precipitationProbPct: 80,
        sourceUrl: "",
      },
    });
    expect(clear.score).toBeGreaterThan(cloudy.score);
  });

  it("provides a rating label", () => {
    const result = assessObservingConditions({
      date: new Date(Date.UTC(2024, 0, 10, 6, 0, 0)),
      latitudeDeg: 0,
      longitudeDeg: 0,
    });
    expect(["poor", "fair", "good", "excellent"]).toContain(result.rating);
  });
});
