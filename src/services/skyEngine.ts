import { celestialCatalog } from "@/data/skyData";
import { CelestialObject } from "@/types/sky";

export function buildVisibleSky(hourOffset: number): CelestialObject[] {
  return celestialCatalog.map((object, index) => {
    const drift = hourOffset * 0.018;
    const verticalShift = ((index % 2 === 0 ? 1 : -1) * hourOffset) / 180;
    const nextX = Math.max(0.08, Math.min(0.92, object.screenX + drift));
    const nextY = Math.max(0.1, Math.min(0.82, object.screenY + verticalShift));

    return {
      ...object,
      screenX: nextX,
      screenY: nextY,
    };
  });
}

export function findCelestialObject(objectId?: string) {
  if (!objectId) {
    return undefined;
  }

  return celestialCatalog.find((item) => item.id === objectId);
}
