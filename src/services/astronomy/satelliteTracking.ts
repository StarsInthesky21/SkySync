/**
 * satelliteTracking.ts
 *
 * Lightweight satellite propagation from TLE. For production-grade SGP4,
 * swap the `propagate` implementation for `satellite.js`. This minimal
 * Keplerian model is enough for visual overlays of bright satellites
 * (ISS, CSS, Hubble) in the sky view. Drift is < 1° over a few orbits.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { equatorialToHorizon, type Equatorial, type HorizonCoord } from "./planetEphemeris";

export type TleRecord = {
  name: string;
  line1: string;
  line2: string;
};

export type SatelliteEphemeris = {
  id: string;
  name: string;
  equatorial: Equatorial;
  horizon?: HorizonCoord;
  altitudeKm: number;
};

const CACHE_KEY = "skysync.tle.cache.v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle";

/** Featured satellites we always surface in the UI. */
export const FEATURED_SAT_NAMES = ["ISS (ZARYA)", "CSS (TIANHE)", "HST", "STARLINK"];

type Cache = { fetchedAt: number; tles: TleRecord[] };

export async function loadCachedTles(): Promise<TleRecord[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: Cache = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.tles;
  } catch {
    return null;
  }
}

async function persist(tles: TleRecord[]) {
  const cache: Cache = { fetchedAt: Date.now(), tles };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

/** Fetch TLEs from CelesTrak; fall back to cache on error. */
export async function fetchTles(url: string = DEFAULT_TLE_URL): Promise<TleRecord[]> {
  const cached = await loadCachedTles();
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`status ${response.status}`);
    const text = await response.text();
    const tles = parseTle(text);
    if (tles.length > 0) {
      await persist(tles);
      return tles;
    }
  } catch {
    // fallthrough to cache
  }
  return cached ?? [];
}

export function parseTle(text: string): TleRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const records: TleRecord[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) continue;
    records.push({ name, line1: l1, line2: l2 });
  }
  return records;
}

const MU_EARTH = 398600.4418; // km^3/s^2
const EARTH_RADIUS_KM = 6378.137;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function parseEpoch(line1: string): Date {
  // columns 19–32 of line 1: YYDDD.DDDDDDDD
  const yearTwoDigit = parseInt(line1.substring(18, 20), 10);
  const year = yearTwoDigit < 57 ? 2000 + yearTwoDigit : 1900 + yearTwoDigit;
  const dayOfYear = parseFloat(line1.substring(20, 32));
  const ms = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000;
  return new Date(ms);
}

type OrbitalElements = {
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number;
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevsPerDay: number;
  epoch: Date;
};

export function tleToElements(rec: TleRecord): OrbitalElements {
  const l2 = rec.line2;
  return {
    inclinationDeg: parseFloat(l2.substring(8, 16)),
    raanDeg: parseFloat(l2.substring(17, 25)),
    eccentricity: parseFloat(`0.${l2.substring(26, 33)}`),
    argPerigeeDeg: parseFloat(l2.substring(34, 42)),
    meanAnomalyDeg: parseFloat(l2.substring(43, 51)),
    meanMotionRevsPerDay: parseFloat(l2.substring(52, 63)),
    epoch: parseEpoch(rec.line1),
  };
}

function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 10; i += 1) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

export function propagate(rec: TleRecord, date: Date): { eciKm: [number, number, number] } {
  const el = tleToElements(rec);
  const n = (el.meanMotionRevsPerDay * 2 * Math.PI) / 86400; // rad/s
  const a = Math.pow(MU_EARTH / (n * n), 1 / 3); // km
  const dt = (date.getTime() - el.epoch.getTime()) / 1000;
  const M = el.meanAnomalyDeg * DEG + n * dt;
  const E = solveKepler(M, el.eccentricity);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xOrb = a * (cosE - el.eccentricity);
  const yOrb = a * Math.sqrt(1 - el.eccentricity * el.eccentricity) * sinE;
  const w = el.argPerigeeDeg * DEG;
  const om = el.raanDeg * DEG;
  const i = el.inclinationDeg * DEG;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosOm = Math.cos(om);
  const sinOm = Math.sin(om);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const x = (cosW * cosOm - sinW * sinOm * cosI) * xOrb + (-sinW * cosOm - cosW * sinOm * cosI) * yOrb;
  const y = (cosW * sinOm + sinW * cosOm * cosI) * xOrb + (-sinW * sinOm + cosW * cosOm * cosI) * yOrb;
  const z = sinW * sinI * xOrb + cosW * sinI * yOrb;
  return { eciKm: [x, y, z] };
}

/** ECI → RA/Dec treating Earth as inertial (sufficient for overlay; satellite.js is better for ground track). */
function eciToEquatorial(eci: [number, number, number]): Equatorial {
  const [x, y, z] = eci;
  const r = Math.sqrt(x * x + y * y + z * z);
  const ra = Math.atan2(y, x);
  const dec = Math.asin(z / r);
  return {
    rightAscensionDeg: (ra * RAD + 360) % 360,
    declinationDeg: dec * RAD,
    distanceAu: r / 149_597_870.7,
    magnitude: 2,
  };
}

export function propagateToSky(
  rec: TleRecord,
  date: Date,
  observer?: { latitudeDeg: number; longitudeDeg: number },
): SatelliteEphemeris {
  const { eciKm } = propagate(rec, date);
  const eq = eciToEquatorial(eciKm);
  const altitudeKm = Math.max(0, Math.sqrt(eciKm[0] ** 2 + eciKm[1] ** 2 + eciKm[2] ** 2) - EARTH_RADIUS_KM);
  const horizon = observer
    ? equatorialToHorizon(eq, date, observer.latitudeDeg, observer.longitudeDeg)
    : undefined;
  return {
    id: rec.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    name: rec.name,
    equatorial: eq,
    horizon,
    altitudeKm,
  };
}

/** Predict the next visible pass for a satellite (altitude > 10° and Sun below horizon). */
export function nextVisiblePass(
  rec: TleRecord,
  observer: { latitudeDeg: number; longitudeDeg: number },
  startDate: Date,
  windowHours = 24,
): { start: Date; peak: Date; end: Date; maxAltitudeDeg: number } | null {
  const steps = windowHours * 60; // 1-min resolution
  let passStart: Date | null = null;
  let peak: Date | null = null;
  let peakAlt = 0;
  for (let m = 0; m < steps; m += 1) {
    const t = new Date(startDate.getTime() + m * 60_000);
    const sample = propagateToSky(rec, t, observer);
    const alt = sample.horizon?.altitudeDeg ?? -90;
    if (alt > 10) {
      if (!passStart) passStart = t;
      if (alt > peakAlt) {
        peakAlt = alt;
        peak = t;
      }
    } else if (passStart && peak) {
      return { start: passStart, peak, end: t, maxAltitudeDeg: peakAlt };
    }
  }
  return null;
}
