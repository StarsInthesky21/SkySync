/**
 * planetEphemeris.ts
 *
 * Self-contained astronomical ephemeris for Sun, Moon, and major planets.
 * Based on J. Meeus "Astronomical Algorithms" low-precision formulas.
 * Accurate to ~1 arcminute for planets, ~0.5° for Moon — more than enough
 * for a visual stargazing app. No external dependencies; works fully offline.
 */

const J2000 = 2451545.0;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const AU_IN_KM = 149_597_870.7;

function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

function julianCenturies(date: Date): number {
  return (julianDay(date) - J2000) / 36525;
}

function normDeg(v: number): number {
  let x = v % 360;
  if (x < 0) x += 360;
  return x;
}

function obliquity(T: number): number {
  return (23.43929111 - 0.0130041667 * T - 0.00000016389 * T * T) * DEG;
}

/** Greenwich Mean Sidereal Time in degrees. */
export function gmstDegrees(date: Date): number {
  const T = julianCenturies(date);
  const theta =
    280.46061837 + 360.98564736629 * (julianDay(date) - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return normDeg(theta);
}

/** Local sidereal time for a given longitude (east positive). */
export function localSiderealDegrees(date: Date, longitudeDeg: number): number {
  return normDeg(gmstDegrees(date) + longitudeDeg);
}

export type Equatorial = {
  rightAscensionDeg: number; // 0..360
  declinationDeg: number; // -90..90
  distanceAu: number;
  magnitude: number;
};

/** Meeus sun position — accurate to ~0.01°. */
export function sunEquatorial(date: Date): Equatorial {
  const T = julianCenturies(date);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const e = 0.016708634 - 0.000042037 * T;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const trueLon = (L0 + C) * DEG;
  const v = M + C * DEG;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(v));
  const eps = obliquity(T);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(trueLon), Math.cos(trueLon));
  const dec = Math.asin(Math.sin(eps) * Math.sin(trueLon));
  return {
    rightAscensionDeg: normDeg(ra * RAD),
    declinationDeg: dec * RAD,
    distanceAu: R,
    magnitude: -26.74,
  };
}

/** Low-precision moon position (Meeus ch. 47 truncated). */
export function moonEquatorial(date: Date): Equatorial {
  const T = julianCenturies(date);
  const Lp = (218.3164477 + 481267.88123421 * T) * DEG;
  const D = (297.8501921 + 445267.1114034 * T) * DEG;
  const M = (357.5291092 + 35999.0502909 * T) * DEG;
  const Mp = (134.9633964 + 477198.8675055 * T) * DEG;
  const F = (93.272095 + 483202.0175233 * T) * DEG;

  const lon =
    Lp * RAD +
    6.289 * Math.sin(Mp) -
    1.274 * Math.sin(Mp - 2 * D) +
    0.658 * Math.sin(2 * D) -
    0.186 * Math.sin(M) -
    0.059 * Math.sin(2 * Mp - 2 * D) -
    0.057 * Math.sin(Mp + M - 2 * D) +
    0.053 * Math.sin(Mp + 2 * D) +
    0.046 * Math.sin(2 * D - M) +
    0.041 * Math.sin(Mp - M);

  const lat =
    5.128 * Math.sin(F) + 0.281 * Math.sin(Mp + F) - 0.278 * Math.sin(F - Mp) - 0.173 * Math.sin(F - 2 * D);

  const distKm =
    385000.56 -
    20905.355 * Math.cos(Mp) -
    3699.111 * Math.cos(2 * D - Mp) -
    2955.968 * Math.cos(2 * D) -
    569.925 * Math.cos(2 * Mp);

  const lonR = lon * DEG;
  const latR = lat * DEG;
  const eps = obliquity(T);
  const ra = Math.atan2(Math.sin(lonR) * Math.cos(eps) - Math.tan(latR) * Math.sin(eps), Math.cos(lonR));
  const dec = Math.asin(Math.sin(latR) * Math.cos(eps) + Math.cos(latR) * Math.sin(eps) * Math.sin(lonR));
  return {
    rightAscensionDeg: normDeg(ra * RAD),
    declinationDeg: dec * RAD,
    distanceAu: distKm / AU_IN_KM,
    magnitude: -10,
  };
}

/** Lunar phase 0..1 (0 = new, 0.5 = full). */
export function moonPhase(date: Date): number {
  const T = julianCenturies(date);
  const D = ((297.8501921 + 445267.1114034 * T) * DEG) % (2 * Math.PI);
  const phase = (1 - Math.cos(D)) / 2;
  return phase;
}

/** Fraction of lunar disc illuminated 0..1. */
export function moonIllumination(date: Date): number {
  const sun = sunEquatorial(date);
  const moon = moonEquatorial(date);
  const cosPsi =
    Math.sin(sun.declinationDeg * DEG) * Math.sin(moon.declinationDeg * DEG) +
    Math.cos(sun.declinationDeg * DEG) *
      Math.cos(moon.declinationDeg * DEG) *
      Math.cos((sun.rightAscensionDeg - moon.rightAscensionDeg) * DEG);
  const psi = Math.acos(Math.max(-1, Math.min(1, cosPsi)));
  return (1 - Math.cos(psi)) / 2;
}

// Keplerian elements (mean values, epoch J2000.0) for each planet.
// Source: JPL Approximate Positions of Planets (valid 1800–2050).
type OrbitEl = {
  a0: number;
  a1: number;
  e0: number;
  e1: number;
  i0: number;
  i1: number;
  L0: number;
  L1: number;
  w0: number;
  w1: number;
  om0: number;
  om1: number;
};

const ORBIT: Record<string, OrbitEl> = {
  mercury: {
    a0: 0.38709927,
    a1: 0.0000037,
    e0: 0.20563593,
    e1: 0.00001906,
    i0: 7.00497902,
    i1: -0.00594749,
    L0: 252.2503235,
    L1: 149472.67411175,
    w0: 77.45779628,
    w1: 0.16047689,
    om0: 48.33076593,
    om1: -0.12534081,
  },
  venus: {
    a0: 0.72333566,
    a1: 0.0000039,
    e0: 0.00677672,
    e1: -0.00004107,
    i0: 3.39467605,
    i1: -0.0007889,
    L0: 181.9790995,
    L1: 58517.81538729,
    w0: 131.60246718,
    w1: 0.00268329,
    om0: 76.67984255,
    om1: -0.27769418,
  },
  earth: {
    a0: 1.00000261,
    a1: 0.00000562,
    e0: 0.01671123,
    e1: -0.00004392,
    i0: -0.00001531,
    i1: -0.01294668,
    L0: 100.46457166,
    L1: 35999.37244981,
    w0: 102.93768193,
    w1: 0.32327364,
    om0: 0,
    om1: 0,
  },
  mars: {
    a0: 1.52371034,
    a1: 0.00001847,
    e0: 0.0933941,
    e1: 0.00007882,
    i0: 1.84969142,
    i1: -0.00813131,
    L0: -4.55343205,
    L1: 19140.30268499,
    w0: -23.94362959,
    w1: 0.44441088,
    om0: 49.55953891,
    om1: -0.29257343,
  },
  jupiter: {
    a0: 5.202887,
    a1: -0.00011607,
    e0: 0.04838624,
    e1: -0.00013253,
    i0: 1.30439695,
    i1: -0.00183714,
    L0: 34.39644051,
    L1: 3034.74612775,
    w0: 14.72847983,
    w1: 0.21252668,
    om0: 100.47390909,
    om1: 0.20469106,
  },
  saturn: {
    a0: 9.53667594,
    a1: -0.0012506,
    e0: 0.05386179,
    e1: -0.00050991,
    i0: 2.48599187,
    i1: 0.00193609,
    L0: 49.95424423,
    L1: 1222.49362201,
    w0: 92.59887831,
    w1: -0.41897216,
    om0: 113.66242448,
    om1: -0.28867794,
  },
  uranus: {
    a0: 19.18916464,
    a1: -0.00196176,
    e0: 0.04725744,
    e1: -0.00004397,
    i0: 0.77263783,
    i1: -0.00242939,
    L0: 313.23810451,
    L1: 428.48202785,
    w0: 170.9542763,
    w1: 0.40805281,
    om0: 74.01692503,
    om1: 0.04240589,
  },
  neptune: {
    a0: 30.06992276,
    a1: 0.00026291,
    e0: 0.00859048,
    e1: 0.00005105,
    i0: 1.77004347,
    i1: 0.00035372,
    L0: -55.12002969,
    L1: 218.45945325,
    w0: 44.96476227,
    w1: -0.32241464,
    om0: 131.78422574,
    om1: -0.00508664,
  },
};

const PLANET_MAG0: Record<string, number> = {
  mercury: -0.42,
  venus: -4.4,
  mars: -2.0,
  jupiter: -9.4,
  saturn: -8.88,
  uranus: -7.19,
  neptune: -6.87,
};

function solveKepler(M: number, e: number): number {
  // Newton-Raphson. M in radians.
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i += 1) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

function heliocentric(el: OrbitEl, T: number) {
  const a = el.a0 + el.a1 * T;
  const e = el.e0 + el.e1 * T;
  const i = (el.i0 + el.i1 * T) * DEG;
  const L = (el.L0 + el.L1 * T) * DEG;
  const w = (el.w0 + el.w1 * T) * DEG;
  const om = (el.om0 + el.om1 * T) * DEG;
  const M = L - w;
  const argPeri = w - om;
  const E = solveKepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e);
  // Position in orbital plane
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  // Rotate into ecliptic frame
  const cosW = Math.cos(argPeri);
  const sinW = Math.sin(argPeri);
  const cosOm = Math.cos(om);
  const sinOm = Math.sin(om);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const xecl = (cosW * cosOm - sinW * sinOm * cosI) * xp + (-sinW * cosOm - cosW * sinOm * cosI) * yp;
  const yecl = (cosW * sinOm + sinW * cosOm * cosI) * xp + (-sinW * sinOm + cosW * cosOm * cosI) * yp;
  const zecl = sinW * sinI * xp + cosW * sinI * yp;
  return { x: xecl, y: yecl, z: zecl };
}

export function planetEquatorial(planet: string, date: Date): Equatorial {
  const T = julianCenturies(date);
  const target = ORBIT[planet];
  const earth = ORBIT.earth;
  if (!target || !earth) {
    throw new Error(`Unknown planet ${planet}`);
  }
  const p = heliocentric(target, T);
  const e = heliocentric(earth, T);
  const geoX = p.x - e.x;
  const geoY = p.y - e.y;
  const geoZ = p.z - e.z;
  const eps = obliquity(T);
  // Ecliptic → equatorial
  const xe = geoX;
  const ye = geoY * Math.cos(eps) - geoZ * Math.sin(eps);
  const ze = geoY * Math.sin(eps) + geoZ * Math.cos(eps);
  const dist = Math.sqrt(xe * xe + ye * ye + ze * ze);
  const ra = Math.atan2(ye, xe);
  const dec = Math.asin(ze / dist);
  // Approximate magnitude: base + 5*log10(r*d) where r is heliocentric, d geocentric
  const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  const mag = (PLANET_MAG0[planet] ?? 0) + 5 * Math.log10(Math.max(0.1, r * dist));
  return {
    rightAscensionDeg: normDeg(ra * RAD),
    declinationDeg: dec * RAD,
    distanceAu: dist,
    magnitude: mag,
  };
}

export type HorizonCoord = {
  altitudeDeg: number;
  azimuthDeg: number;
};

/** Convert equatorial RA/Dec to horizontal altitude/azimuth for an observer. */
export function equatorialToHorizon(
  eq: Equatorial,
  date: Date,
  observerLatDeg: number,
  observerLonDeg: number,
): HorizonCoord {
  const lst = localSiderealDegrees(date, observerLonDeg);
  const H = (lst - eq.rightAscensionDeg) * DEG;
  const phi = observerLatDeg * DEG;
  const dec = eq.declinationDeg * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(phi)) / (Math.cos(alt) * Math.cos(phi));
  const sinAz = (-Math.sin(H) * Math.cos(dec)) / Math.cos(alt);
  const az = Math.atan2(sinAz, cosAz);
  return {
    altitudeDeg: alt * RAD,
    azimuthDeg: normDeg(az * RAD),
  };
}

/** Compute rise/transit/set times (UTC) for a body at an observer location. */
export type RiseSet = {
  rise: Date | null;
  transit: Date | null;
  set: Date | null;
};

export function riseTransitSet(
  bodyFn: (d: Date) => Equatorial,
  date: Date,
  observerLatDeg: number,
  observerLonDeg: number,
): RiseSet {
  // Scan a 24h window at 2-minute resolution and look for altitude crossings of 0°.
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  let prevAlt = equatorialToHorizon(bodyFn(start), start, observerLatDeg, observerLonDeg).altitudeDeg;
  let rise: Date | null = null;
  let set: Date | null = null;
  let transit: Date | null = null;
  let peakAlt = -Infinity;
  for (let m = 2; m <= 24 * 60; m += 2) {
    const t = new Date(start.getTime() + m * 60_000);
    const alt = equatorialToHorizon(bodyFn(t), t, observerLatDeg, observerLonDeg).altitudeDeg;
    if (prevAlt <= 0 && alt > 0 && !rise) rise = t;
    if (prevAlt >= 0 && alt < 0 && !set) set = t;
    if (alt > peakAlt) {
      peakAlt = alt;
      transit = t;
    }
    prevAlt = alt;
  }
  return { rise, transit, set };
}

export const PLANET_IDS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"] as const;
export type PlanetId = (typeof PLANET_IDS)[number];
