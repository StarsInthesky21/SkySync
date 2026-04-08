export type CelestialKind =
  | "star"
  | "planet"
  | "satellite"
  | "meteor"
  | "constellation-anchor";

export type CelestialObject = {
  id: string;
  name: string;
  kind: CelestialKind;
  distance: string;
  magnitude: number;
  mythology: string;
  facts: string[];
  screenX: number;
  screenY: number;
  color: string;
  label?: string;
  constellationId?: string;
};

export type ConstellationLine = {
  id: string;
  from: string;
  to: string;
};

export type DiscoverySuggestion = {
  id: string;
  title: string;
  detail: string;
  objectId?: string;
  urgency?: "live" | "tonight" | "watch";
};

export type SpaceEvent = {
  id: string;
  title: string;
  window: string;
  detail: string;
};
