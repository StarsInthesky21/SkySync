/**
 * skyProjection.ts
 *
 * Projects celestial objects from equatorial coordinates to a 2D screen
 * position given the device's current attitude. Uses full quaternion math
 * so arbitrary device orientations project correctly.
 *
 * Coordinate frames:
 *   - Celestial: right-handed, +X toward RA=0/Dec=0, +Z toward celestial north
 *   - Device:    +X right, +Y up, +Z toward viewer
 *   - World:     north, up, east (NED-ish) — we align the sky to local horizon
 */

export type Vec3 = [number, number, number];
export type Quaternion = [number, number, number, number]; // (x, y, z, w)

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Convert RA/Dec to a unit vector on the celestial sphere. */
export function equatorialToVector(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

/** Rotate the celestial frame into the observer's local horizon frame. */
export function celestialToLocal(v: Vec3, latitudeDeg: number, localSiderealDeg: number): Vec3 {
  // Rotate by -LST around Z, then by (lat - 90°) around Y to get NEU frame.
  const lstRad = localSiderealDeg * DEG;
  const cosL = Math.cos(-lstRad);
  const sinL = Math.sin(-lstRad);
  const x1 = v[0] * cosL - v[1] * sinL;
  const y1 = v[0] * sinL + v[1] * cosL;
  const z1 = v[2];
  const colat = (90 - latitudeDeg) * DEG;
  const cosC = Math.cos(colat);
  const sinC = Math.sin(colat);
  // Rotate around Y so zenith → +Z (north on X, east on -Y, up on Z)
  const x2 = x1 * cosC + z1 * sinC;
  const y2 = y1;
  const z2 = -x1 * sinC + z1 * cosC;
  // Re-map axes: north=+X1 east=+Y1 up=+Z1 → device-natural: east=+X, up=+Y, south=+Z
  return [-y2, z2, -x2];
}

/** Euler angles (yaw=α heading, pitch=β, roll=γ) in degrees → device quaternion. */
export function eulerToQuaternion(yawDeg: number, pitchDeg: number, rollDeg: number): Quaternion {
  const y = yawDeg * DEG * 0.5;
  const p = pitchDeg * DEG * 0.5;
  const r = rollDeg * DEG * 0.5;
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  const cr = Math.cos(r);
  const sr = Math.sin(r);
  // ZXY intrinsic (common for mobile device frames).
  return [
    sp * cr * cy - cp * sr * sy,
    cp * sr * cy + sp * cr * sy,
    cp * cr * sy - sp * sr * cy,
    cp * cr * cy + sp * sr * sy,
  ];
}

export function quaternionConjugate(q: Quaternion): Quaternion {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function rotateByQuaternion(v: Vec3, q: Quaternion): Vec3 {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  // t = 2 * (q.xyz × v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  // v' = v + w*t + q.xyz × t
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

/** Project a local-frame direction into a 2D screen using a pinhole camera.
 *  Returns null when outside the frustum. */
export function projectToScreen(
  vLocal: Vec3,
  deviceQ: Quaternion,
  fovYDeg: number,
  aspect: number,
): { x: number; y: number; depth: number } | null {
  // Move from world to device frame by inverse rotation.
  const inv = quaternionConjugate(deviceQ);
  const rotated = rotateByQuaternion(vLocal, inv);
  const [dx, dy, dz] = rotated;
  // Camera looks down +Z in device frame; require positive depth.
  if (dz <= 0) return null;
  const tanY = Math.tan((fovYDeg * DEG) / 2);
  const tanX = tanY * aspect;
  const sx = dx / (dz * tanX);
  const sy = dy / (dz * tanY);
  if (sx < -1 || sx > 1 || sy < -1 || sy > 1) return null;
  return { x: sx, y: -sy, depth: dz };
}

/** Simple 1-Euro low-pass filter for quaternions (spherical linear interp). */
export function slerpQ(a: Quaternion, b: Quaternion, t: number): Quaternion {
  let cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (cos < 0) {
    bb = [-b[0], -b[1], -b[2], -b[3]];
    cos = -cos;
  }
  if (cos > 0.9995) {
    return [
      a[0] + t * (bb[0] - a[0]),
      a[1] + t * (bb[1] - a[1]),
      a[2] + t * (bb[2] - a[2]),
      a[3] + t * (bb[3] - a[3]),
    ];
  }
  const theta = Math.acos(cos);
  const sinTheta = Math.sin(theta);
  const s0 = Math.sin((1 - t) * theta) / sinTheta;
  const s1 = Math.sin(t * theta) / sinTheta;
  return [s0 * a[0] + s1 * bb[0], s0 * a[1] + s1 * bb[1], s0 * a[2] + s1 * bb[2], s0 * a[3] + s1 * bb[3]];
}

export const Math3D = {
  DEG,
  RAD,
};
