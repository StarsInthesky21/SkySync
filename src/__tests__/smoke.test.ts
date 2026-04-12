/**
 * Smoke test — statically imports every major module so broken imports fail
 * fast on CI before we even hit the UI.
 */

import "@/services/astronomy/planetEphemeris";
import "@/services/astronomy/satelliteTracking";
import "@/services/astronomy/weatherService";
import "@/services/astronomy/observingConditions";
import "@/services/astronomy/catalogLoader";
import "@/services/astronomy/passScheduler";
import "@/services/skyEngine";
import "@/services/sky/skyProjection";
import "@/services/sky/glSkyRenderer";
import "@/services/voice/tokenProvider";
import "@/services/voice/livekitService";
import "@/services/voice/reconciliation";
import { buildLiveCatalog } from "@/services/astronomy/liveCatalog";

describe("smoke", () => {
  it("every major service imports cleanly", () => {
    expect(true).toBe(true);
  });

  it("building a live catalog yields Sun, Moon, and planets", async () => {
    const list = await buildLiveCatalog({
      date: new Date("2024-06-21T12:00:00Z"),
      includeStars: false,
      includeSatellites: false,
    });
    const ids = list.map((o) => o.id);
    expect(ids).toContain("sun");
    expect(ids).toContain("moon");
    expect(ids).toContain("jupiter");
    expect(ids).toContain("saturn");
  });
});
