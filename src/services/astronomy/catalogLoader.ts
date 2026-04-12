/**
 * catalogLoader.ts
 *
 * Lazy-loads the extended HYG star catalog. The base bundle ships with
 * the ~500-star hygCatalog; this module lets us pull the 8 900-star
 * subset on demand. The remote JSON is cached on-disk after first fetch.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SkyObject } from "@/types/sky";
import { hygStars } from "@/data/hygCatalog";

const CACHE_KEY = "skysync.catalog.extended.v1";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_URL =
  "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/CURRENT/hyg_v42.json";

type CacheEntry = { fetchedAt: number; stars: SkyObject[] };

let inMemoryExtended: SkyObject[] | null = null;

/** Return the bundled catalog immediately. Sync. */
export function getBundledCatalog(): SkyObject[] {
  return hygStars;
}

/** Pull the extended catalog from cache, memory, or network. */
export async function loadExtendedCatalog(url: string = DEFAULT_URL): Promise<SkyObject[]> {
  if (inMemoryExtended) return inMemoryExtended;

  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: CacheEntry = JSON.parse(raw);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS && Array.isArray(parsed.stars)) {
        inMemoryExtended = parsed.stars;
        return parsed.stars;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`status ${response.status}`);
    const text = await response.text();
    const parsed = parseHygJson(text);
    inMemoryExtended = parsed;
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), stars: parsed }));
    } catch {
      /* storage full — fall back to memory-only */
    }
    return parsed;
  } catch {
    return hygStars;
  }
}

/** Parse a HYG JSON export into SkyObject rows. Filters to mag <= 6.5. */
export function parseHygJson(text: string): SkyObject[] {
  let rows: Array<Record<string, unknown>>;
  try {
    rows = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];

  const out: SkyObject[] = [];
  for (const row of rows) {
    const raH = Number(row.ra);
    const dec = Number(row.dec);
    const mag = Number(row.mag);
    if (!Number.isFinite(raH) || !Number.isFinite(dec) || !Number.isFinite(mag)) continue;
    if (mag > 6.5) continue;
    const name = String(row.proper ?? row.bf ?? row.hip ?? row.id ?? `hyg-${out.length}`);
    const ci = Number(row.ci);
    out.push({
      id: `hyg-${row.id ?? out.length}`,
      name,
      kind: "star",
      description: `HYG catalog star, magnitude ${mag.toFixed(2)}.`,
      distanceFromEarth: Number.isFinite(row.dist) ? `${Number(row.dist).toFixed(1)} pc` : "unknown",
      mythologyStory: "",
      scientificFacts: [],
      color: colorFromColorIndex(ci),
      longitude: raH * 15,
      latitude: dec,
      magnitude: mag,
      motionFactor: 0.98,
    });
  }
  return out;
}

/** Translate a stellar B-V color index to a hex color. Handles NaN. */
export function colorFromColorIndex(ci: number): string {
  if (!Number.isFinite(ci)) return "#d4e2ff";
  if (ci < -0.2) return "#adc8ff";
  if (ci < 0.1) return "#cadcff";
  if (ci < 0.3) return "#d4e2ff";
  if (ci < 0.6) return "#f8f0e0";
  if (ci < 1.0) return "#fff4d6";
  if (ci < 1.4) return "#ffd9a0";
  return "#ffb07b";
}
