/**
 * liveCatalog.ts
 *
 * Builds a sky object list with LIVE positions for planets, Sun, Moon,
 * and satellites, while keeping static star positions from the HYG
 * subset. This is the new source of truth for the sky engine when
 * `observerLatitude`/`observerLongitude` are provided.
 */

import type { SkyObject } from "@/types/sky";
import { hygStars } from "@/data/hygCatalog";
import {
  PLANET_IDS,
  moonEquatorial,
  moonIllumination,
  planetEquatorial,
  sunEquatorial,
  type Equatorial,
} from "./planetEphemeris";
import { loadCachedTles, propagateToSky, type TleRecord } from "./satelliteTracking";

const PLANET_META: Record<string, Omit<SkyObject, "longitude" | "latitude" | "magnitude">> = {
  mercury: {
    id: "mercury",
    name: "Mercury",
    kind: "planet",
    description: "The smallest planet, hugging the horizon at dawn and dusk.",
    distanceFromEarth: "~77 million km (varies)",
    mythologyStory: "Mercury, swift messenger of the Roman gods, matched the planet's fast motion.",
    scientificFacts: [
      "Orbit of 88 Earth days — the fastest planet.",
      "Virtually no atmosphere; temperatures swing 600 °C day-to-night.",
      "A single solar day lasts two Mercurian years.",
    ],
    color: "#d4c5a9",
    motionFactor: 0,
    previewTitle: "Swift Messenger",
    previewDescription: "A cratered grey-brown world hugging the twilight horizon.",
  },
  venus: {
    id: "venus",
    name: "Venus",
    kind: "planet",
    description: "The brightest planet, visible as the morning or evening star.",
    distanceFromEarth: "~38–261 million km",
    mythologyStory: "Named for the Roman goddess of love and beauty for its brilliant glow.",
    scientificFacts: [
      "Surface at 460 °C from runaway greenhouse effect.",
      "Rotates retrograde — a day lasts longer than its year.",
      "Thickest atmosphere of any rocky planet, reflecting 75 % of sunlight.",
    ],
    color: "#ffe3bd",
    motionFactor: 0,
    previewTitle: "Cloud-Shrouded Planet",
    previewDescription: "A smooth, bright orb wrapped in reflective cloud layers.",
  },
  mars: {
    id: "mars",
    name: "Mars",
    kind: "planet",
    description: "The red planet, distinctive for its rusty hue.",
    distanceFromEarth: "~55–401 million km",
    mythologyStory: "Mars, Roman god of war, earned the association from the planet's blood-red color.",
    scientificFacts: [
      "Iron-oxide dust gives the surface its red color.",
      "Olympus Mons is the tallest volcano in the solar system, 21.9 km high.",
      "Has two small moons, Phobos and Deimos.",
    ],
    color: "#ff7a67",
    motionFactor: 0,
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    kind: "planet",
    description: "King of planets — a gas giant visible as one of the brightest objects in the sky.",
    distanceFromEarth: "~588–968 million km",
    mythologyStory: "Jupiter, king of Roman gods, matched the planet's size and brightness.",
    scientificFacts: [
      "Mass is more than twice that of all other planets combined.",
      "The Great Red Spot is a storm larger than Earth, raging ≥ 350 years.",
      "At least 95 known moons, including the four Galilean satellites.",
    ],
    color: "#ffd49d",
    motionFactor: 0,
    previewTitle: "Gas Giant View",
    previewDescription: "A striped gas giant with soft rotating cloud bands.",
  },
  saturn: {
    id: "saturn",
    name: "Saturn",
    kind: "planet",
    description: "Ringed gas giant, a highlight through even small telescopes.",
    distanceFromEarth: "~1.2–1.7 billion km",
    mythologyStory: "Kronos/Saturn was the Titan of time and harvest in Greek-Roman myth.",
    scientificFacts: [
      "Rings span 282 000 km yet are only tens of metres thick.",
      "146 known moons; Titan has methane lakes and a thick nitrogen atmosphere.",
      "Less dense than water — would float given a large enough bathtub.",
    ],
    color: "#f2ddb1",
    motionFactor: 0,
    previewTitle: "Ringed Planet View",
    previewDescription: "A golden sphere surrounded by angled icy rings.",
  },
  uranus: {
    id: "uranus",
    name: "Uranus",
    kind: "planet",
    description: "Ice giant tilted on its side, barely visible to unaided eyes.",
    distanceFromEarth: "~2.6–3.2 billion km",
    mythologyStory: "Named for Ouranos, Greek personification of the sky.",
    scientificFacts: [
      "Rotational axis tilted 98° — seasons last 21 years.",
      "Atmospheric methane gives the planet its aqua tint.",
      "Has 13 faint rings and 27 known moons.",
    ],
    color: "#a5d8ff",
    motionFactor: 0,
  },
  neptune: {
    id: "neptune",
    name: "Neptune",
    kind: "planet",
    description: "Distant blue ice giant, invisible to unaided eyes but striking in telescopes.",
    distanceFromEarth: "~4.3–4.7 billion km",
    mythologyStory: "Neptune, Roman god of the sea, mirrors the planet's deep blue.",
    scientificFacts: [
      "Wind speeds reach 2 100 km/h — the strongest of any planet.",
      "First planet found by mathematical prediction rather than observation.",
      "Its largest moon, Triton, orbits retrograde — likely captured.",
    ],
    color: "#6b8cff",
    motionFactor: 0,
  },
};

const SUN_META: Omit<SkyObject, "longitude" | "latitude" | "magnitude"> = {
  id: "sun",
  name: "Sun",
  kind: "planet",
  description: "Our own star — anchor of the solar system.",
  distanceFromEarth: "~149.6 million km (1 AU)",
  mythologyStory:
    "Revered as Helios, Ra, Sol, Surya — nearly every ancient culture placed the Sun at its mythic core.",
  scientificFacts: [
    "G2V main-sequence star, ~4.6 billion years old.",
    "Fuses ~600 million tonnes of hydrogen into helium every second.",
    "Accounts for 99.86 % of the solar system's mass.",
  ],
  color: "#ffe9a0",
  motionFactor: 0,
};

const MOON_META: Omit<SkyObject, "longitude" | "latitude" | "magnitude"> = {
  id: "moon",
  name: "Moon",
  kind: "planet",
  description: "Earth's closest companion and only natural satellite.",
  distanceFromEarth: "~384 400 km",
  mythologyStory:
    "Luna, Selene, Chang'e, Mawu — the Moon appears across nearly every mythology as a timekeeper and mirror to the Sun.",
  scientificFacts: [
    "Tidally locked — the same face always points toward Earth.",
    "Created ~4.5 billion years ago, likely from a Mars-sized impact on proto-Earth.",
    "Its orbit recedes from Earth at ~3.8 cm/year.",
  ],
  color: "#e8e6d9",
  motionFactor: 0,
};

function toSkyObject(
  meta: Omit<SkyObject, "longitude" | "latitude" | "magnitude">,
  eq: Equatorial,
): SkyObject {
  return {
    ...meta,
    longitude: eq.rightAscensionDeg,
    latitude: eq.declinationDeg,
    magnitude: eq.magnitude,
  };
}

export type LiveCatalogOptions = {
  date: Date;
  includeSun?: boolean;
  includeMoon?: boolean;
  includePlanets?: boolean;
  includeSatellites?: boolean;
  includeStars?: boolean;
  observer?: { latitudeDeg: number; longitudeDeg: number };
  tleOverride?: TleRecord[];
};

export async function buildLiveCatalog(options: LiveCatalogOptions): Promise<SkyObject[]> {
  const {
    date,
    includeSun = true,
    includeMoon = true,
    includePlanets = true,
    includeSatellites = true,
    includeStars = true,
    observer,
    tleOverride,
  } = options;

  const results: SkyObject[] = [];

  if (includeStars) {
    results.push(...hygStars);
  }

  if (includeSun) {
    results.push(toSkyObject(SUN_META, sunEquatorial(date)));
  }

  if (includeMoon) {
    const moon = toSkyObject(MOON_META, moonEquatorial(date));
    const illum = moonIllumination(date);
    moon.description = `${MOON_META.description} Currently ${Math.round(illum * 100)}% illuminated.`;
    results.push(moon);
  }

  if (includePlanets) {
    for (const id of PLANET_IDS) {
      const meta = PLANET_META[id];
      if (!meta) continue;
      const eq = planetEquatorial(id, date);
      results.push(toSkyObject(meta, eq));
    }
  }

  if (includeSatellites) {
    const tles = tleOverride ?? (await loadCachedTles()) ?? [];
    for (const rec of tles.slice(0, 40)) {
      const sample = propagateToSky(
        rec,
        date,
        observer
          ? {
              latitudeDeg: observer.latitudeDeg,
              longitudeDeg: observer.longitudeDeg,
            }
          : undefined,
      );
      const id = `sat-${sample.id}`;
      results.push({
        id,
        name: sample.name,
        kind: "satellite",
        description: `Orbiting at ~${Math.round(sample.altitudeKm)} km.`,
        distanceFromEarth: `${Math.round(sample.altitudeKm)} km`,
        mythologyStory: "A spacecraft of our own making — a new kind of star.",
        scientificFacts: [
          `Altitude ≈ ${Math.round(sample.altitudeKm)} km above sea level.`,
          "Positions propagated from CelesTrak two-line elements.",
        ],
        color: "#73fbd3",
        longitude: sample.equatorial.rightAscensionDeg,
        latitude: sample.equatorial.declinationDeg,
        magnitude: 2.5,
        motionFactor: 0,
      });
    }
  }

  return results;
}
