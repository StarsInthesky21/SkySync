import { constellations, myths, skyObjects } from "@/data/skyData";
import { CustomConstellation } from "@/types/rooms";
import { Constellation, MythStory, RenderedSkyObject, SkyObject, SkyTransform, Viewpoint } from "@/types/sky";

const viewpointOffsets: Record<Viewpoint, number> = {
  earth: 0,
  mars: 58,
  moon: 14,
};

const viewpointLatitudeOffsets: Record<Viewpoint, number> = {
  earth: 0,
  mars: 6,
  moon: 2,
};

function normalizeLongitude(value: number) {
  let normalized = value % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

function totalHoursSinceReference(date: Date) {
  const reference = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
  return (date.getTime() - reference) / (1000 * 60 * 60);
}

function relativeLongitude(objectLongitude: number, transform: SkyTransform, motionFactor: number) {
  const hours = totalHoursSinceReference(transform.date);
  const shifted = normalizeLongitude(
    objectLongitude + hours * motionFactor + viewpointOffsets[transform.viewpoint] - transform.rotation,
  );
  return shifted > 180 ? shifted - 360 : shifted;
}

export function renderSkyObjects(transform: SkyTransform): RenderedSkyObject[] {
  return skyObjects.map((object) => {
    const lon = relativeLongitude(object.longitude, transform, object.motionFactor);
    const latitude = object.latitude + viewpointLatitudeOffsets[transform.viewpoint];
    const x = 0.5 + (lon / 180) * 0.46 * transform.zoom;
    const y = 0.5 - (latitude / 90) * 0.33 * transform.zoom;
    const sizeBoost = object.kind === "planet" ? 2.5 : object.kind === "satellite" ? 1.5 : object.kind === "meteor" ? 2 : 0;
    const size = Math.max(2.5, 6.2 - object.magnitude + sizeBoost);
    const isVisible = x >= -0.2 && x <= 1.2 && y >= -0.15 && y <= 1.15;

    return {
      ...object,
      x,
      y,
      size,
      isVisible,
    };
  });
}

export function getConstellationSegments(renderedObjects: RenderedSkyObject[]) {
  const byId = Object.fromEntries(renderedObjects.map((object) => [object.id, object]));

  return constellations.flatMap((constellation) => {
    const segments = [];
    for (let index = 0; index < constellation.starIds.length - 1; index += 1) {
      const from = byId[constellation.starIds[index]];
      const to = byId[constellation.starIds[index + 1]];
      if (!from || !to || !from.isVisible || !to.isVisible) {
        continue;
      }
      segments.push({
        id: `${constellation.id}-${index}`,
        title: constellation.name,
        color: "rgba(143,188,255,0.4)",
        from,
        to,
      });
    }
    return segments;
  });
}

export function getCustomConstellationSegments(renderedObjects: RenderedSkyObject[], customs: CustomConstellation[]) {
  const byId = Object.fromEntries(renderedObjects.map((object) => [object.id, object]));

  return customs.flatMap((pattern) => {
    const segments = [];
    for (let index = 0; index < pattern.starIds.length - 1; index += 1) {
      const from = byId[pattern.starIds[index]];
      const to = byId[pattern.starIds[index + 1]];
      if (!from || !to || !from.isVisible || !to.isVisible) {
        continue;
      }
      segments.push({
        id: `${pattern.id}-${index}`,
        title: pattern.title,
        color: pattern.color,
        from,
        to,
      });
    }
    return segments;
  });
}

export function findSkyObject(objectId?: string): SkyObject | undefined {
  if (!objectId) {
    return undefined;
  }
  return skyObjects.find((object) => object.id === objectId);
}

export function getConstellationName(constellationId?: string) {
  if (!constellationId) {
    return undefined;
  }
  return constellations.find((constellation) => constellation.id === constellationId)?.name;
}

export function getStoryForConstellation(constellationId?: string): MythStory | undefined {
  const storyId = constellations.find((constellation) => constellation.id === constellationId)?.storyId;
  if (!storyId) {
    return undefined;
  }
  return myths.find((story) => story.id === storyId);
}

export function focusRotationForObject(objectId: string, date: Date, viewpoint: Viewpoint) {
  const object = findSkyObject(objectId);
  if (!object) {
    return 0;
  }
  const hours = totalHoursSinceReference(date);
  return normalizeLongitude(object.longitude + hours * object.motionFactor + viewpointOffsets[viewpoint]);
}

export function getVisibleThingsTonight(renderedObjects: RenderedSkyObject[]) {
  return renderedObjects
    .filter((object) => object.isVisible && (object.kind === "planet" || object.kind === "satellite" || object.magnitude < 1.1))
    .sort((left, right) => left.magnitude - right.magnitude)
    .slice(0, 6);
}

export function getConstellations(): Constellation[] {
  return constellations;
}
