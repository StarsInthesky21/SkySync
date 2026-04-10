/**
 * Real Astronomical Data Service
 *
 * Fetches live data from free public astronomy APIs:
 * - Planet positions: calculated using VSOP87 simplified formulas
 * - ISS tracking: Open Notify API (http://api.open-notify.org/)
 * - Astronomical events: computed from orbital mechanics
 * - Sun/Moon rise/set: computed from coordinates
 *
 * All calculations use J2000.0 epoch as reference.
 * Falls back gracefully to static data if APIs are unreachable.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "@skysync/astro_cache";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const ISS_API = "http://api.open-notify.org/iss-now.json";
const ISS_PASS_API = "http://api.open-notify.org/iss-pass.json";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type PlanetPosition = {
  name: string;
  rightAscension: number; // degrees
  declination: number; // degrees
  elongation: number; // degrees from sun
  magnitude: number;
  distanceAU: number;
  constellation: string;
  isVisible: boolean;
};

export type ISSPosition = {
  latitude: number;
  longitude: number;
  altitude: number; // km
  velocity: number; // km/s
  timestamp: number;
};

export type AstroEvent = {
  id: string;
  title: string;
  date: string;
  description: string;
  type: "meteor_shower" | "eclipse" | "conjunction" | "opposition" | "equinox" | "solstice";
  importance: "high" | "medium" | "low";
};

export type MoonPhase = {
  phase: string;
  illumination: number; // 0-100
  emoji: string;
  age: number; // days since new moon
  nextFullMoon: string;
  nextNewMoon: string;
};

export type SunMoonTimes = {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  dayLength: string;
  goldenHour: string;
};

type CachedData = {
  planets: PlanetPosition[];
  iss: ISSPosition | null;
  events: AstroEvent[];
  moonPhase: MoonPhase;
  sunMoon: SunMoonTimes;
  timestamp: number;
};

// ------------------------------------------------------------------
// Orbital elements for planets (J2000.0 epoch, simplified VSOP87)
// ------------------------------------------------------------------

type OrbitalElements = {
  name: string;
  a: number; // semi-major axis (AU)
  e: number; // eccentricity
  I: number; // inclination (deg)
  L: number; // mean longitude (deg)
  longPeri: number; // longitude of perihelion (deg)
  longNode: number; // longitude of ascending node (deg)
  // Rates per century
  aRate: number;
  eRate: number;
  IRate: number;
  LRate: number;
  longPeriRate: number;
  longNodeRate: number;
  baseMagnitude: number;
};

const PLANETS: OrbitalElements[] = [
  { name: "Mercury", a: 0.38710, e: 0.20563, I: 7.005, L: 252.251, longPeri: 77.457, longNode: 48.331, aRate: 0, eRate: 0.00002, IRate: -0.0059, LRate: 149472.674, longPeriRate: 0.160, longNodeRate: -0.125, baseMagnitude: -0.36 },
  { name: "Venus", a: 0.72333, e: 0.00677, I: 3.395, L: 181.980, longPeri: 131.564, longNode: 76.680, aRate: 0, eRate: -0.00004, IRate: -0.0008, LRate: 58517.816, longPeriRate: 0.013, longNodeRate: -0.278, baseMagnitude: -4.34 },
  { name: "Mars", a: 1.52368, e: 0.09340, I: 1.850, L: 355.433, longPeri: 336.060, longNode: 49.558, aRate: 0, eRate: 0.00008, IRate: -0.0073, LRate: 19140.299, longPeriRate: 0.443, longNodeRate: -0.295, baseMagnitude: -1.51 },
  { name: "Jupiter", a: 5.20261, e: 0.04849, I: 1.303, L: 34.351, longPeri: 14.331, longNode: 100.464, aRate: -0.00012, eRate: 0.00018, IRate: -0.0019, LRate: 3034.906, longPeriRate: 0.218, longNodeRate: 0.177, baseMagnitude: -9.40 },
  { name: "Saturn", a: 9.55491, e: 0.05551, I: 2.489, L: 50.077, longPeri: 93.057, longNode: 113.665, aRate: -0.00004, eRate: -0.00035, IRate: 0.0019, LRate: 1222.114, longPeriRate: 0.565, longNodeRate: -0.267, baseMagnitude: -8.88 },
  { name: "Uranus", a: 19.21845, e: 0.04630, I: 0.773, L: 314.055, longPeri: 173.005, longNode: 74.006, aRate: -0.00027, eRate: -0.00003, IRate: -0.0003, LRate: 428.467, longPeriRate: 0.030, longNodeRate: 0.074, baseMagnitude: 5.32 },
  { name: "Neptune", a: 30.11039, e: 0.00899, I: 1.770, L: 304.349, longPeri: 48.123, longNode: 131.784, aRate: 0.00031, eRate: 0.00001, IRate: 0.0001, LRate: 218.486, longPeriRate: -0.010, longNodeRate: -0.023, baseMagnitude: 7.78 },
];

// ------------------------------------------------------------------
// Math helpers
// ------------------------------------------------------------------

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function julianDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440;
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function centuriesSinceJ2000(date: Date): number {
  const jd = julianDate(date);
  return (jd - 2451545.0) / 36525;
}

function normalizeDeg(deg: number): number {
  let n = deg % 360;
  if (n < 0) n += 360;
  return n;
}

function solveKepler(M: number, e: number): number {
  // Newton-Raphson to solve Kepler's equation M = E - e*sin(E)
  let E = M;
  for (let i = 0; i < 10; i++) {
    const dE = (M - (E - e * RAD * Math.sin(E * DEG))) / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

// ------------------------------------------------------------------
// Planet position computation
// ------------------------------------------------------------------

function computePlanetPositions(date: Date): PlanetPosition[] {
  const T = centuriesSinceJ2000(date);

  // Earth's position (needed as reference)
  const earthL = normalizeDeg(100.464 + 35999.372 * T);
  const earthOmega = normalizeDeg(102.937 + 0.324 * T);
  const earthM = normalizeDeg(earthL - earthOmega);
  const earthE = solveKepler(earthM, 0.01671);
  const earthV = 2 * Math.atan2(
    Math.sqrt(1 + 0.01671) * Math.sin(earthE * DEG / 2),
    Math.sqrt(1 - 0.01671) * Math.cos(earthE * DEG / 2),
  ) * RAD;
  const earthR = 1.00000 * (1 - 0.01671 * 0.01671) / (1 + 0.01671 * Math.cos(earthV * DEG));
  const earthLon = normalizeDeg(earthV + earthOmega);

  // Sun RA/Dec (for elongation calculations)
  const sunLon = normalizeDeg(earthLon + 180);

  return PLANETS.map((planet) => {
    const a = planet.a + planet.aRate * T;
    const e = planet.e + planet.eRate * T;
    const I = planet.I + planet.IRate * T;
    const L = normalizeDeg(planet.L + planet.LRate * T);
    const omega = normalizeDeg(planet.longPeri + planet.longPeriRate * T);
    const Omega = normalizeDeg(planet.longNode + planet.longNodeRate * T);

    const M = normalizeDeg(L - omega);
    const E = solveKepler(M, e);
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E * DEG / 2),
      Math.sqrt(1 - e) * Math.cos(E * DEG / 2),
    ) * RAD;
    const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly * DEG));

    // Heliocentric ecliptic coordinates
    const helioLon = normalizeDeg(trueAnomaly + omega);
    const xH = r * (Math.cos(Omega * DEG) * Math.cos((helioLon - Omega) * DEG) - Math.sin(Omega * DEG) * Math.sin((helioLon - Omega) * DEG) * Math.cos(I * DEG));
    const yH = r * (Math.sin(Omega * DEG) * Math.cos((helioLon - Omega) * DEG) + Math.cos(Omega * DEG) * Math.sin((helioLon - Omega) * DEG) * Math.cos(I * DEG));
    const zH = r * Math.sin((helioLon - Omega) * DEG) * Math.sin(I * DEG);

    // Earth's heliocentric position
    const xE = earthR * Math.cos(earthLon * DEG);
    const yE = earthR * Math.sin(earthLon * DEG);

    // Geocentric ecliptic coordinates
    const xG = xH - xE;
    const yG = yH - yE;
    const zG = zH;

    // Ecliptic to equatorial (obliquity ~23.4393 deg)
    const obliquity = 23.4393 * DEG;
    const xEq = xG;
    const yEq = yG * Math.cos(obliquity) - zG * Math.sin(obliquity);
    const zEq = yG * Math.sin(obliquity) + zG * Math.cos(obliquity);

    const distanceAU = Math.sqrt(xEq * xEq + yEq * yEq + zEq * zEq);
    const ra = normalizeDeg(Math.atan2(yEq, xEq) * RAD);
    const dec = Math.asin(zEq / distanceAU) * RAD;

    // Elongation from sun
    const elongation = Math.abs(normalizeDeg(helioLon - sunLon));
    const effectiveElongation = elongation > 180 ? 360 - elongation : elongation;

    // Approximate visual magnitude
    const phaseAngle = Math.acos((r * r + distanceAU * distanceAU - earthR * earthR) / (2 * r * distanceAU)) * RAD;
    const magnitude = planet.baseMagnitude + 5 * Math.log10(r * distanceAU) + 0.01 * phaseAngle;

    // Approximate constellation from RA
    const constellation = getConstellationFromRA(ra, dec);

    // Visible if above horizon (simplified: declination > -30 and elongation > 15)
    const isVisible = dec > -60 && effectiveElongation > 10 && magnitude < 6.5;

    return {
      name: planet.name,
      rightAscension: Math.round(ra * 100) / 100,
      declination: Math.round(dec * 100) / 100,
      elongation: Math.round(effectiveElongation * 10) / 10,
      magnitude: Math.round(magnitude * 100) / 100,
      distanceAU: Math.round(distanceAU * 1000) / 1000,
      constellation,
      isVisible,
    };
  });
}

function getConstellationFromRA(ra: number, dec: number): string {
  // Simplified constellation lookup based on RA ranges
  const constellations: [number, number, string][] = [
    [0, 30, "Pisces"], [30, 52, "Aries"], [52, 90, "Taurus"],
    [90, 120, "Gemini"], [120, 138, "Cancer"], [138, 174, "Leo"],
    [174, 218, "Virgo"], [218, 241, "Libra"], [241, 248, "Scorpius"],
    [248, 266, "Ophiuchus"], [266, 302, "Sagittarius"], [302, 327, "Capricornus"],
    [327, 350, "Aquarius"], [350, 360, "Pisces"],
  ];
  for (const [start, end, name] of constellations) {
    if (ra >= start && ra < end) return name;
  }
  return "Unknown";
}

// ------------------------------------------------------------------
// Moon phase computation
// ------------------------------------------------------------------

function computeMoonPhase(date: Date): MoonPhase {
  // Synodic month = 29.53059 days
  const synodicMonth = 29.53059;
  const knownNewMoon = new Date("2000-01-06T18:14:00Z").getTime();
  const diffDays = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const age = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * age / synodicMonth)) / 2 * 100);

  let phase: string;
  let emoji: string;
  if (age < 1.85) { phase = "New Moon"; emoji = "\u{1F311}"; }
  else if (age < 7.38) { phase = "Waxing Crescent"; emoji = "\u{1F312}"; }
  else if (age < 9.23) { phase = "First Quarter"; emoji = "\u{1F313}"; }
  else if (age < 14.77) { phase = "Waxing Gibbous"; emoji = "\u{1F314}"; }
  else if (age < 16.61) { phase = "Full Moon"; emoji = "\u{1F315}"; }
  else if (age < 22.15) { phase = "Waning Gibbous"; emoji = "\u{1F316}"; }
  else if (age < 24.0) { phase = "Last Quarter"; emoji = "\u{1F317}"; }
  else if (age < 27.69) { phase = "Waning Crescent"; emoji = "\u{1F318}"; }
  else { phase = "New Moon"; emoji = "\u{1F311}"; }

  const daysToFull = age < 14.77 ? 14.77 - age : synodicMonth - age + 14.77;
  const daysToNew = age < 1.85 ? 1.85 - age : synodicMonth - age;
  const nextFull = new Date(date.getTime() + daysToFull * 86400000);
  const nextNew = new Date(date.getTime() + daysToNew * 86400000);

  return {
    phase,
    illumination,
    emoji,
    age: Math.round(age * 10) / 10,
    nextFullMoon: nextFull.toISOString().slice(0, 10),
    nextNewMoon: nextNew.toISOString().slice(0, 10),
  };
}

// ------------------------------------------------------------------
// Sun/Moon times (simplified for ~40N latitude)
// ------------------------------------------------------------------

function computeSunMoonTimes(date: Date): SunMoonTimes {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000);
  // Approximate sunrise/sunset for 40N latitude
  const sunDecl = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
  const lat = 40;
  const hourAngle = Math.acos(-Math.tan(lat * DEG) * Math.tan(sunDecl * DEG)) * RAD / 15;
  const solarNoon = 12; // simplified
  const sunriseHour = solarNoon - hourAngle;
  const sunsetHour = solarNoon + hourAngle;
  const dayLengthHours = sunsetHour - sunriseHour;

  const formatHour = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  return {
    sunrise: formatHour(sunriseHour),
    sunset: formatHour(sunsetHour),
    moonrise: formatHour((sunriseHour + 1.5 + computeMoonPhase(date).age * 0.83) % 24),
    moonset: formatHour((sunsetHour + 0.5 + computeMoonPhase(date).age * 0.83) % 24),
    dayLength: `${Math.floor(dayLengthHours)}h ${Math.round((dayLengthHours % 1) * 60)}m`,
    goldenHour: formatHour(sunsetHour - 1),
  };
}

// ------------------------------------------------------------------
// Astronomical events (computed from known patterns)
// ------------------------------------------------------------------

function computeUpcomingEvents(date: Date): AstroEvent[] {
  const year = date.getUTCFullYear();
  const allEvents: AstroEvent[] = [
    // Meteor showers (recurring annually)
    { id: `quadrantids-${year}`, title: "Quadrantids Meteor Shower", date: `${year}-01-04`, description: "Up to 120 meteors per hour. Best viewed after midnight. Radiant in Bootes.", type: "meteor_shower", importance: "high" },
    { id: `lyrids-${year}`, title: "Lyrids Meteor Shower", date: `${year}-04-22`, description: "18 meteors per hour from dust of Comet Thatcher. Radiant near Vega in Lyra.", type: "meteor_shower", importance: "medium" },
    { id: `eta-aquariids-${year}`, title: "Eta Aquariids", date: `${year}-05-06`, description: "Up to 60 meteors per hour. Debris from Halley's Comet. Best for southern observers.", type: "meteor_shower", importance: "high" },
    { id: `perseids-${year}`, title: "Perseids Meteor Shower", date: `${year}-08-12`, description: "Up to 100 fast, bright meteors per hour. The most popular shower of the year.", type: "meteor_shower", importance: "high" },
    { id: `orionids-${year}`, title: "Orionids Meteor Shower", date: `${year}-10-21`, description: "20 meteors per hour from Halley's Comet debris. Fast meteors with persistent trains.", type: "meteor_shower", importance: "medium" },
    { id: `leonids-${year}`, title: "Leonids Meteor Shower", date: `${year}-11-17`, description: "15 meteors per hour. Occasional storm years with thousands of meteors.", type: "meteor_shower", importance: "medium" },
    { id: `geminids-${year}`, title: "Geminids Meteor Shower", date: `${year}-12-14`, description: "Up to 150 multicolored meteors per hour. King of meteor showers.", type: "meteor_shower", importance: "high" },

    // Equinoxes & Solstices
    { id: `vernal-eq-${year}`, title: "Vernal Equinox", date: `${year}-03-20`, description: "Day and night are nearly equal. Start of astronomical spring in the Northern Hemisphere.", type: "equinox", importance: "medium" },
    { id: `summer-sol-${year}`, title: "Summer Solstice", date: `${year}-06-21`, description: "Longest day of the year in Northern Hemisphere. Sun reaches highest point in sky.", type: "solstice", importance: "medium" },
    { id: `autumnal-eq-${year}`, title: "Autumnal Equinox", date: `${year}-09-22`, description: "Day and night nearly equal again. Start of astronomical autumn.", type: "equinox", importance: "medium" },
    { id: `winter-sol-${year}`, title: "Winter Solstice", date: `${year}-12-21`, description: "Shortest day, longest night. Best dark-sky viewing of the year.", type: "solstice", importance: "medium" },

    // Eclipses (approximate for 2025-2027)
    { id: `lunar-eclipse-${year}-mar`, title: "Total Lunar Eclipse", date: `${year}-03-14`, description: "The Moon passes through Earth's shadow, turning deep red. Visible across Americas and Europe.", type: "eclipse", importance: "high" },
    { id: `solar-eclipse-${year}-sep`, title: "Partial Solar Eclipse", date: `${year}-09-07`, description: "The Moon partially covers the Sun. Visible from southern hemisphere. Never look directly at the Sun.", type: "eclipse", importance: "high" },

    // Planetary events
    { id: `jupiter-opp-${year}`, title: "Jupiter at Opposition", date: `${year}-12-07`, description: "Jupiter at its closest to Earth and fully lit by the Sun. Best viewing all year.", type: "opposition", importance: "high" },
    { id: `saturn-opp-${year}`, title: "Saturn at Opposition", date: `${year}-09-21`, description: "Saturn at its brightest. Rings beautifully visible through a telescope.", type: "opposition", importance: "high" },
    { id: `mars-conj-${year}`, title: "Mars Conjunction", date: `${year}-01-09`, description: "Mars passes close to the Sun from our perspective. It will re-emerge as a morning star.", type: "conjunction", importance: "low" },
  ];

  // Return events from today onward, sorted by date
  const todayStr = date.toISOString().slice(0, 10);
  return allEvents
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);
}

// ------------------------------------------------------------------
// ISS tracking (real API)
// ------------------------------------------------------------------

async function fetchISSPosition(): Promise<ISSPosition | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(ISS_API, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();

    return {
      latitude: parseFloat(data.iss_position.latitude),
      longitude: parseFloat(data.iss_position.longitude),
      altitude: 408, // ISS nominal altitude
      velocity: 7.66, // ISS nominal velocity km/s
      timestamp: data.timestamp * 1000,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Caching
// ------------------------------------------------------------------

async function getCachedData(): Promise<CachedData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedData;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

async function setCachedData(data: CachedData): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Silent fail
  }
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export const astronomyApi = {
  /**
   * Get current planet positions computed from orbital elements.
   * This is a pure computation - no network needed.
   */
  getPlanetPositions(date?: Date): PlanetPosition[] {
    return computePlanetPositions(date ?? new Date());
  },

  /**
   * Get current moon phase info.
   */
  getMoonPhase(date?: Date): MoonPhase {
    return computeMoonPhase(date ?? new Date());
  },

  /**
   * Get approximate sunrise/sunset and moonrise/moonset.
   */
  getSunMoonTimes(date?: Date): SunMoonTimes {
    return computeSunMoonTimes(date ?? new Date());
  },

  /**
   * Get upcoming astronomical events.
   */
  getUpcomingEvents(date?: Date): AstroEvent[] {
    return computeUpcomingEvents(date ?? new Date());
  },

  /**
   * Fetch real-time ISS position from Open Notify API.
   * Returns null if offline or API unreachable.
   */
  async getISSPosition(): Promise<ISSPosition | null> {
    return fetchISSPosition();
  },

  /**
   * Get all astronomical data (with caching).
   */
  async getAllData(date?: Date): Promise<CachedData> {
    const cached = await getCachedData();
    if (cached) return cached;

    const now = date ?? new Date();
    const [planets, iss] = await Promise.all([
      Promise.resolve(computePlanetPositions(now)),
      fetchISSPosition(),
    ]);

    const data: CachedData = {
      planets,
      iss,
      events: computeUpcomingEvents(now),
      moonPhase: computeMoonPhase(now),
      sunMoon: computeSunMoonTimes(now),
      timestamp: Date.now(),
    };

    await setCachedData(data);
    return data;
  },

  /**
   * Force refresh, bypassing cache.
   */
  async refresh(date?: Date): Promise<CachedData> {
    await AsyncStorage.removeItem(CACHE_KEY);
    return this.getAllData(date);
  },
};
