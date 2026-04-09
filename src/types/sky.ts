export type SkyObjectKind = "star" | "planet" | "satellite" | "meteor";

export type Viewpoint = "earth" | "mars" | "moon";

export type SkyObject = {
  id: string;
  name: string;
  kind: SkyObjectKind;
  description: string;
  distanceFromEarth: string;
  mythologyStory: string;
  scientificFacts: string[];
  color: string;
  longitude: number;
  latitude: number;
  magnitude: number;
  motionFactor: number;
  constellationId?: string;
  previewTitle?: string;
  previewDescription?: string;
};

export type Constellation = {
  id: string;
  name: string;
  starIds: string[];
  storyId?: string;
};

export type GuidedTarget = {
  id: string;
  title: string;
  subtitle: string;
  objectId: string;
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  progressLabel: string;
};

export type DailyChallenge = {
  id: string;
  title: string;
  reward: string;
  objectId?: string;
};

export type MythStory = {
  id: string;
  title: string;
  constellationId?: string;
  frames: string[];
};

export type RenderedSkyObject = SkyObject & {
  x: number;
  y: number;
  size: number;
  isVisible: boolean;
};

export type SkyTransform = {
  rotation: number;
  zoom: number;
  date: Date;
  viewpoint: Viewpoint;
};
