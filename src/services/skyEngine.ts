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

// J2000.0 epoch - standard astronomical reference (Jan 1, 2000 12:00 TT)
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0, 0);

function totalHoursSinceReference(date: Date) {
  return (date.getTime() - J2000_EPOCH) / (1000 * 60 * 60);
}

function relativeLongitude(objectLongitude: number, transform: SkyTransform, motionFactor: number) {
  const hours = totalHoursSinceReference(transform.date);
  const shifted = normalizeLongitude(
    objectLongitude + hours * motionFactor + viewpointOffsets[transform.viewpoint] - transform.rotation,
  );
  return shifted > 180 ? shifted - 360 : shifted;
}

export function renderSkyObjects(transform: SkyTransform): RenderedSkyObject[] {
  const safeZoom = Math.max(0.1, Math.min(10, Number.isFinite(transform.zoom) ? transform.zoom : 1));
  const safeRotation = Number.isFinite(transform.rotation) ? transform.rotation : 0;
  const safeTransform = { ...transform, zoom: safeZoom, rotation: safeRotation };

  // Observer latitude affects which part of the sky is visible
  // Northern observers see more northern sky, southern observers see more southern sky
  const observerLat = safeTransform.observerLatitude ?? 0;
  const observerLon = safeTransform.observerLongitude ?? 0;

  // Local sidereal time approximation: shifts the sky based on time + longitude
  const hours = totalHoursSinceReference(safeTransform.date);
  const lst = (hours * 15.04107 + observerLon) % 360; // approximate LST in degrees

  return skyObjects.map((object) => {
    const lon = relativeLongitude(object.longitude, safeTransform, object.motionFactor);
    // Shift latitude rendering based on observer position
    // Objects at the observer's zenith appear near center; objects below horizon are hidden
    const objectDeclination = object.latitude + viewpointLatitudeOffsets[safeTransform.viewpoint];
    // Altitude check: object is above horizon if dec > (observerLat - 90)
    const minVisibleDec = observerLat - 90;
    const maxVisibleDec = observerLat + 90;
    const isAboveHorizon = objectDeclination >= minVisibleDec && objectDeclination <= maxVisibleDec;

    const x = 0.5 + (lon / 180) * 0.46 * safeTransform.zoom;
    const y = 0.5 - (objectDeclination / 90) * 0.33 * safeTransform.zoom;
    const sizeBoost = object.kind === "planet" ? 2.5 : object.kind === "satellite" ? 1.5 : object.kind === "meteor" ? 2 : 0;
    const size = Math.max(2.5, 6.2 - object.magnitude + sizeBoost);
    const isInView = x >= -0.2 && x <= 1.2 && y >= -0.15 && y <= 1.15;
    const isVisible = isInView && isAboveHorizon;

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
